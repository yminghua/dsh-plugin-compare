# dsh-proof

> 别只信 README，跑一下证明。

`dsh-proof` 是一个 DeepSeek Harness 插件，用同一任务的原生运行与插件运行做 Before / After 对比，并把 Session 证据生成分屏回放、指标差异和可分享的 Proof Card。

## 当前状态

这是第一版可安装骨架：已经包含 Host 事件采集器、纯函数比较核心、默认脱敏器，以及 Web 会话头中的 `Proof` 入口和比较面板。Session 选择、指标投影和导出将在下一个里程碑完成，详见 [路线图](./docs/ROADMAP.md)。

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

## License

MIT
