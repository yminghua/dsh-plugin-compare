# dsh-proof

> 别只信 README，跑一下证明。

`dsh-proof` 是一个 DeepSeek Harness 插件，用同一任务的原生运行与插件运行做 Before / After 对比，并把 Session 证据生成分屏回放、指标差异和可分享的 Proof Card。

## 当前状态

当前 Alpha 版已经包含 Host 事件采集、Session 双选、指标投影和比较面板，并能下载默认脱敏的 JSON 或自包含 HTML 证据报告。任务成功与否仍显示为“未判定”，不会把一次正常结束误写成插件效果更好。详见 [路线图](./docs/ROADMAP.md)。

## 开发

需要 Node.js 22.19+ 和 pnpm 11.19。

```bash
pnpm install
pnpm verify
```

安装本地版本到 DSH Web：

```bash
dsh plugin --profile web add link:/absolute/path/to/dsh-proof
dsh web
```

## 目录边界

- `src/core/`：与 DSH 无关的比较、指标、脱敏逻辑
- `src/index.ts`：DSH Host 事件适配
- `src/client/`：Web UI 和后续分屏回放
- `test/`：核心行为与事件折叠测试
- `docs/`：架构、信任边界和路线图

当前开发基线为 DSH `0.1.1-rc.2`。DSH 仍处于快速迭代阶段，每次发布都必须重新执行真实服务契约测试。

## License

MIT
