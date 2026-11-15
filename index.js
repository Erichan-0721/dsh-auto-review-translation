export const inject = ['approval', 'translator']

export function apply(ctx, config = {}) {
  const provider = config.provider || 'bing'
  const targetLanguage = config.targetLanguage || 'zh-CN'
  const timeoutMs = Math.max(200, Math.min(60000, Number(config.timeoutMs) || 8000))
  const cache = new Map()

  ctx.on('approval/request', async (request, next) => {
    const source = request.displayReason?.en
    if (typeof request.reason !== 'string' || !request.reason.startsWith('Auto review denied tool "') ||
        typeof source !== 'string' || !source.trim() || request.signal?.aborted) return next()

    let translated = cache.get(source)
    if (!translated) {
      const timeout = AbortSignal.timeout(timeoutMs)
      const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout
      const doTranslate = async () => {
        const available = await ctx.translator.availableProviders(signal)
        for (const route of [...new Set([provider, 'bing', 'google'])]) {
          if (signal.aborted) return undefined
          if (!available.includes(route)) continue
          const paid = route === 'deepseek-official' || route === 'deepseek-account'
          const sessionId = request.agent?.session?.id
          if (paid && !sessionId) continue
          try {
            const spec = ctx.translator.resolve({ text: source, sourceLanguage: 'auto', targetLanguage, provider: route, ...(paid ? { sessionId } : {}) })
            const text = await ctx.translator.translate(spec, signal)
            if (typeof text === 'string' && text.trim()) return text
          } catch (error) {
            if (!signal.aborted) ctx.logger?.warn?.(`approval translation failed for ${route}: ${error?.message || error}`)
          }
        }
      }
      try {
        translated = await Promise.race([
          doTranslate(),
          new Promise(resolve => signal.addEventListener('abort', () => resolve(undefined), { once: true }))
        ])
      } catch (error) {
        ctx.logger?.warn?.(`approval translation failed: ${error?.message || error}`)
      }
      if (!translated || request.signal?.aborted) return next()
      if (cache.size >= 128) cache.delete(cache.keys().next().value)
      cache.set(source, translated)
    }

    const original = request.displayReason
    const base = targetLanguage.split(/[-_]/)[0]
    try {
      request.displayReason = { ...original, [base]: translated, [targetLanguage]: translated }
    } catch (error) {
      ctx.logger?.warn?.(`approval translation could not update display text: ${error?.message || error}`)
      return next()
    }
    try { return await next() } finally { request.displayReason = original }
  }, { prepend: true })
}

// Approval display translation.
