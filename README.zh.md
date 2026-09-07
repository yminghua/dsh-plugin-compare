# DSH Plugin Compare

> 对比运行，检查证据。

`dsh-plugin-compare` 用已有 Session 或受控 A/B 运行对比 DeepSeek Harness 插件与 Preset，并把真实执行证据整理成并排时间线、指标差异、显式成功检查和可分享的对比报告。

[![DSH Plugin Compare 结果：标准模式与 dsh-expert-mode 对比](./example/readme-demo.png)](./example/results/checkout-demo.html)

## 跟着 example 跑一次

从 [完整演示教程](./example/README.md) 开始：准备故障结算项目，对比标准模式和 `dsh-expert-mode`，查看验收结果，再保存截图与报告。仓库已收录审核后的真实运行 [HTML 报告](./example/results/checkout-demo.html)和 [截图](./example/screenshots/README.md)。教程标出了每一步的截图时机；样例无需第三方依赖，Agent 运行仍会消耗模型额度。在仓库根目录运行 `node example/prepare.mjs` 即可创建新的演示工作区，不会改动固定样例或旧工作区。

## 当前状态

当前 Alpha 版既能比较两个历史 Session，也能运行一组受控 Baseline / Candidate。受控运行会为两边显式选择同一个已配置的 provider/model，复制两份源工作区，分别挂载选择的 Agent Preset，提交完全相同的提示，并可在两边执行同一个成功检查命令、采集当时的 Git 状态和 tracked diff。报告包含同步时间线、持久化文件 diff、显式检查结果，以及默认脱敏的 JSON、自包含 HTML 和 SVG/PNG 对比卡片。详见 [路线图](./docs/ROADMAP.md)。

历史 Session 只展示日志里持久化的 `write` / `edit` diff；不会拿当前工作区状态冒充历史 Git 证据。Git 状态只在受控运行的临时副本中采集。

受控运行支持 1–10 组配对试验，并交替哪一边先执行。界面展示显式检查通过次数，以及耗时和 Token 的配对差值均值、中位数；至少两组时给出 Student-t 95% 区间。JSON 会保留每组的 Session ID 和原始配对观察，便于复算。这个区间描述小样本假设下观察到的波动，不会自动宣布 winner，也不能单独证明因果。复制时会排除依赖目录、拒绝指向工作区外部的符号链接，并且不会复制 Git worktree 的指针文件。

受控 Agent 会显式收到所选 provider/model。如果 Agent 在完成任务前失败，结构化错误会直接显示并写入导出报告，成功检查会标记为 `not-run`，整个比较会标记为无效，不再把未修改代码的测试失败误当成 Preset 结果。

## 分享前的隐私检查

导出内容可能包含提示词、源码路径、代码 diff、命令输出、provider/model 名称和 Session ID。自动脱敏只是尽力匹配，**不代表已经通过隐私审查**。分享 HTML、JSON、SVG、PNG 或截图前，必须逐项检查，并按需移除凭证、账户信息、私有 URL、个人路径和非公开源码。脱敏数量为零，只表示没有命中当前配置的规则。

## 开发

需要 Node.js 22.19+ 和 pnpm 11.19。

```bash
pnpm install
pnpm verify
```

安装本地版本到 DSH Web：

```bash
dsh plugin --profile web add link:/absolute/path/to/dsh-plugin-compare
dsh web
```

## 目录边界

- `src/core/`：与 DSH 无关的比较、指标、脱敏逻辑
- `src/index.ts`：DSH Host 事件适配
- `src/client/`：Web UI、同步时间线和对比报告导出
- `test/`：核心行为与事件折叠测试
- `docs/`：架构、信任边界和路线图

当前开发基线为 DSH `0.1.1-rc.2`。DSH 仍处于快速迭代阶段，每次发布都必须重新执行真实服务契约测试。

CI 会分别验证最低支持版本和 npm 动态 `latest`：真实安装插件、启动 Web Host 并读取客户端 bundle。详情见 [兼容性说明](./docs/COMPATIBILITY.md)。

## License

MIT
