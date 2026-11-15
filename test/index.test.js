import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../index.js'

function setup(translator, config) {
  let listener
  apply({ translator, on: (_event, fn) => { listener = fn } }, config)
  return listener
}
const request = () => ({
  reason: 'Auto review denied tool "test": risk',
  displayReason: { en: 'Auto review denied this call: risk', zh: 'Auto review 拒绝了此调用：risk' }
})
test('translates display text and preserves the approval outcome and source', async () => {
  const listener = setup({availableProviders: async () => ['bing'], resolve: x => x, translate: async () => '中文理由'})
  const req = request()
  let shown
  const result = await listener(req, async () => { shown = {...req.displayReason}; return 'rejected' })
  assert.equal(result, 'rejected')
  assert.equal(shown.zh, '中文理由')
  assert.equal(shown.en, 'Auto review denied this call: risk')
  assert.equal(req.displayReason.zh, 'Auto review 拒绝了此调用：risk')
})
test('falls back to Google and leaves ordinary approvals untouched', async () => {
  const attempted = []
  const listener = setup({availableProviders: async () => ['bing', 'google'], resolve: x => x, translate: async x => {attempted.push(x.provider); if (x.provider === 'bing') throw Error('unavailable'); return '翻译'}})
  const req = request()
  await listener(req, async () => {assert.equal(req.displayReason.zh, '翻译'); return 'allowed-once'})
  assert.deepEqual(attempted, ['bing', 'google'])
  req.reason = 'ordinary approval'
  await listener(req, async () => 'rejected')
  assert.deepEqual(attempted, ['bing', 'google'])
})
test('failure preserves original text and decision', async () => {
  const listener = setup({availableProviders: async () => ['bing'], resolve: x => x, translate: async () => {throw Error('offline')}})
  const req = request()
  const result = await listener(req, async () => {assert.equal(req.displayReason.zh, 'Auto review 拒绝了此调用：risk'); return 'rejected'})
  assert.equal(result, 'rejected')
})
