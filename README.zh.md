# dsh-proof

> 别只信 README，跑一下证明。

`dsh-proof` 是一个 DeepSeek Harness 插件，用同一任务的原生运行与插件运行做 Before / After 对比，并把 Session 证据生成分屏回放、指标差异和可分享的 Proof Card。

## 当前状态

当前 Alpha 版既能比较两个历史 Session，也能运行一组受控 Baseline / Candidate。受控运行会复制两份源工作区，分别挂载选择的 Agent Preset，提交完全相同的提示，并可在两边执行同一个成功检查命令、采集当时的 Git 状态和 tracked diff。报告包含同步时间线、持久化文件 diff、显式检查结果，以及默认脱敏的 JSON、自包含 HTML 和 SVG/PNG Proof Card。详见 [路线图](./docs/ROADMAP.md)。

历史 Session 只展示日志里持久化的 `write` / `edit` diff；不会拿当前工作区状态冒充历史 Git 证据。Git 状态只在受控运行的临时副本中采集。

受控运行支持 1–10 组配对试验，并交替哪一边先执行。界面展示显式检查通过次数，以及耗时和 Token 的配对差值均值、中位数；至少两组时给出 Student-t 95% 区间。JSON 会保留每组的 Session ID 和原始配对观察，便于复算。这个区间描述小样本假设下观察到的波动，不会自动宣布 winner，也不能单独证明因果。复制时会排除依赖目录、拒绝指向工作区外部的符号链接，并且不会复制 Git worktree 的指针文件。

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
- `src/client/`：Web UI、同步时间线和 Proof Card 导出
- `test/`：核心行为与事件折叠测试
- `docs/`：架构、信任边界和路线图

当前开发基线为 DSH `0.1.1-rc.2`。DSH 仍处于快速迭代阶段，每次发布都必须重新执行真实服务契约测试。

## License

MIT
