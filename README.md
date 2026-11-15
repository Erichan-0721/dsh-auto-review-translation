# DSH 自动审批理由翻译

将 DeepSeek Harness 官方自动审批拒绝工具调用后、交由用户决定时的英文理由翻译为中文。插件复用官方「思考过程机器翻译」的 `translator` 服务，在审批窗口显示前替换对应语言的显示文本。原始英文理由、工具参数、审批决定和审计记录不被修改。

## 兼容性与前提

- 已针对 DSH **0.2.2-rc.3** 测试，包元数据也将 DSH 限定为该版本。Node.js 20.3 或更高版本。
- 启用官方「自动授权审查」及「思考过程机器翻译」插件。后者提供所需的 `translator` 服务；没有启用时，翻译组件会等待该服务。
- 只处理官方自动审查拒绝后需要用户决定、且包含英文显示理由的审批请求。普通审批、直接拒绝和已打开的审批卡片不在范围内。

## 安装

DSH 桌面版：在「插件」页面添加本地插件包或目录；解压 `.tgz` 后选择含 `package.json` 的 `package` 目录。插件页面启用本插件和上述两个官方插件。不要与旧的 `dsh-approval-translation-local` 同时启用，以免重复翻译。

源码公开后，也可通过 GitHub 安装（将 `web` 替换为你的目标 profile）：

```sh
dsh plugin --profile web add github:Erichan-0721/dsh-auto-review-translation
```

DSH CLI 自定义 profile：在包含 `.tgz` 文件的目录中执行：

```sh
dsh plugin --profile web add ./dsh-auto-review-translation-0.1.0.tgz
```

将 `web` 换成你的目标 profile。桌面版 `desktop` profile 由桌面应用管理，请使用桌面插件页面。

## 配置

默认 Bing、简体中文、超时 8000 毫秒。可在目标 profile 的用户 `cordis.patch.yml` 中覆盖组件配置：

```yaml
- id: auto-review-translation
  name: dsh-auto-review-translation
  config:
    provider: bing
    targetLanguage: zh-CN
    timeoutMs: 8000
```

`provider` 可选 `bing`、`google`、`deepseek-account`、`deepseek-official`。DeepSeek 路由依赖官方翻译服务中的可用凭据与活动会话，使用官方 Flash 翻译路径且关闭思考。首选路由失败时尝试 Bing 和 Google；均失败或超时后保留原文。`targetLanguage` 接收语言标签；`timeoutMs` 为 200–60000 毫秒。

首次加载或修改代码后，重新加载组件或重启 DSH。只有之后新产生的审批卡片会被处理；已经显示的卡片不会自动更新。

## 数据与限制

翻译时，审批理由会发送给配置的翻译服务及可能触发的备用服务，因此不要在不愿发送给这些服务的场景中启用插件。机器翻译可能不准确；英文界面仍使用原始英文显示理由。审批命令和工具参数不发送给翻译服务，除非它们本身出现在理由文字中。

已通过 DSH 0.2.2-rc.3 的官方审批事件、Cordis 事件系统和官方 translator 服务进行验证。上游实验性接口可能变化，升级 DSH 前请先验证兼容性。

## 发布

包名 `dsh-auto-review-translation`，版本 `0.1.0`。发布前请确认 npm 上该名称可用，或将 `package.json` 的包名和 `cordis.patch.yml` 的组件 `name` 一同改成自己的作用域名称；设置 npm 账户与必要的发布权限后，在包目录执行 `npm publish --access public`。本包尚未发布到 npm。

MIT License，见 [LICENSE](LICENSE)。
