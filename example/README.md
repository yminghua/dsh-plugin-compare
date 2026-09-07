# 跟着跑一次：标准模式 vs dsh-expert-mode

这个 example 演示完整流程：**准备一个有 bug 的结算函数 → 两套 Preset 分别修复 → 独立运行验收测试 → 查看并导出对比报告**。

这里比较的是两套 Agent Preset 配置，不是保证只改变一个变量的因果实验。目标是学会使用 DSH Plugin Compare，不是预设专家模式一定获胜。

> 录制状态：教程、故障 fixture 和一组审核后的 `dsh-plugin-compare` 真实运行[截图](./screenshots/README.md)与[报告](./results/README.md)均已就绪。该单组结果用于演示工作流，不代表稳定排名。

## 目录与注意事项

- `checkout/`：固定的故障起点，**不要在这里修复代码**。
- `prepare.mjs`：每次创建新的演示工作区及独立 Git 基线，不覆盖旧工作区。
- `prompt.txt`：两组使用的同一条任务提示。
- `.work/`：生成的演示工作区，Git 忽略。
- `captures/`：本地原始截图、报告和运行记录，Git 忽略。
- `screenshots/`：审核后的操作截图与初始测试记录。
- `results/`：审核并脱敏的 HTML、JSON、PNG 和 SVG 报告。

样例不需要第三方依赖，只用 Node.js。Agent 调用仍会消耗模型额度。只在这个专用测试项目和可信 Preset 上运行；临时工作区副本不是安全沙箱。测试文件不由框架强制锁定，因此最后还要检查它们有没有被改动。

## 0. 准备 DSH 和两个 Preset

已有可用的 DSH Plugin Compare 环境可以跳过安装，确认新版插件已经构建并重启即可。不要中断正在进行的实验。

新用户先获取本仓库：

```bash
git clone https://github.com/yminghua/dsh-plugin-compare.git
cd dsh-plugin-compare
pnpm install
pnpm verify
```

需要 Node.js 22.19+、pnpm 11.19、Git 和兼容的 DSH。安装本地构建：

```bash
# 在 dsh-plugin-compare 仓库根目录执行
dsh plugin --profile web add "link:$(pwd)"
```

如果没有全局 `dsh` 命令，本教程里的 `dsh` 可以替换为 `pnpm dlx @deepseek-ai/dsh@0.1.1-rc.2`，这是项目验证过的最低支持版本。已有 DSH 环境请沿用其启动方式，不要为了这个例子随意更换版本。

还需要：

1. 在 DSH 中配置一个可用的 provider/model，并确认普通对话可用。不要截图凭据页面。
2. 有“标准模式”作为 Baseline。
3. 已安装并可选择 `dsh-expert-mode` Preset。我们之前的演示使用 v0.9.2；请在运行记录里写实际版本。安装与挂载说明见 [dsh-expert-mode](https://github.com/Asher-2000/dsh-expert-mode)。仅安装 npm 依赖不一定意味着 Preset 已在 DSH 中可用，以选择器为准；已有环境不要重复覆盖同名 Preset。

重启 DSH Web 并刷新浏览器：

```bash
dsh web
```

## 1. 创建全新的故障工作区

在 **dsh-plugin-compare 仓库根目录**的另一个终端执行：

```bash
node example/prepare.mjs
```

脚本输出两条绝对路径：

- **Fresh demo workspace**：后面要填入 Compare 面板的 Source workspace。
- **Save screenshots and reports here**：本轮的素材目录，其中已有 `run-notes.md`。

默认路径形如 `example/.work/checkout-XXXXXX` 和 `example/captures/checkout-XXXXXX`。两者都不会被默认提交。不要使用旧的、已经修好的演示工作区，也不要把整个 dsh-plugin-compare 仓库作为 Source workspace。

## 2. 确认起点确实有 bug

切换到脚本打印的 **Fresh demo workspace**（不是素材目录）：

```bash
cd "/替换为脚本打印的完整工作区路径"
node --test
git status --short
```

**预期：5 项测试，1 项通过、4 项失败，测试命令退出码为 1。** 这是有意准备的故障，不是安装失败。`git status --short` 应无输出。

测试覆盖：拒绝负数金额、SAVE10 九折、VIP 与优惠券不叠加、小额结算非负、保留两位小数。当前代码把九折写成减 10，并错误叠加优惠。

复现时把完整输出保存为 `screenshots/initial-tests.md`，也可另存终端截图；素材须包含测试名称和最终计数，并裁掉个人目录和无关内容。

如果初始已经 5/5 通过，停下来重新运行准备脚本创建新目录，不要继续拿已修好的代码做 demo。

## 3. 打开 Compare，配置 Controlled A/B

在 DSH Web 添加刚创建的演示工作区，创建一个会话，点击会话标题栏的 **Compare**，切换到 **Controlled A/B**。

**不要先在普通聊天中发送修复任务。** 普通聊天可能直接修复源工作区，破坏故障起点。如果空会话还没显示 Compare，可以先发送“只回复准备好了，不要读取、修改文件或执行命令”，再打开 Compare；这不是实验任务，也可能消耗少量模型额度。

按下表填写：

| 字段 | 填写内容 |
| --- | --- |
| Source workspace | 准备脚本输出的 Fresh demo workspace 绝对路径 |
| Same prompt for both variants | 原样复制 [prompt.txt](prompt.txt) |
| Model provider / Model | 你已配置可用的同一个 provider/model，自动用于两组 |
| Baseline preset | 标准模式，记录实际 Preset ID |
| Candidate preset | `dsh-expert-mode` / 专家模式，记录实际版本和 Preset ID |
| Success check command | `node --test` |
| Paired trials | **1**，先跑通完整流程 |

我们之前使用 `deepseek-v4-flash`；你不必使用相同模型，但 A/B 必须使用相同路由，不能把不同模型的差异当成插件差异。若插件身份无法自动识别，报告会显示来源未记录，不要将一个猜测的包名当成已验证事实。

**截图 ①：** 点击运行前，保存 `01-controlled-config.png`。重点保留模型、两个 Preset、提示、测试命令和 trials。绝对路径可在公开副本中遮盖。

## 4. 运行并记录真实进度

点击 **Run controlled A/B** 一次。1 个 paired trial 会顺序运行 **2 个 Agent**，各自在全新的临时工作区中执行相同任务。

观察进度卡：复制工作区 → 启动 Agent → Agent 执行 → 成功检查 → 收集证据／清理。它显示当前轮次、A/B、Preset、已用时间、已完成数量及最近活动；首个 Agent 未完成时没有可靠的剩余时间估计。

**截图 ②：** 在 Agent 执行期间保存 `02-running.png`，让用户能看到真实阶段和耗时。可选录制一小段视频；不要为了等截图重复点击运行。

等待时间取决于模型和 Preset，不承诺固定分钟数。期间不要刷新页面、重启 DSH 或修改源项目；目前没有完整的刷新恢复体验。若提示进度暂不可用，运行可能仍在继续，不要立即启动另一轮。

## 5. 验收结果，而不只是看“更快了多少”

运行结束后，先检查：

1. 两边的 `Execution` 是否为 `completed`。
2. `Success checks` 是否为 `pass`、退出码 0，展开输出确认 **5 tests / 5 pass / 0 fail**。
3. 两边 Git 快照里是否只改了 `src/checkout.mjs`，没有改测试、删断言或改任务规则。若测试被改过，这轮不能作为按本教程成功复现的例子。
4. 插件包名、版本、Preset、模型信息是否符合实际配置。
5. 再比较 Agent 耗时、工具调用、Token 等事实；任意一边更快都可以，不要求固定胜负或百分比。

**截图 ③（主宣传图）：** `03-result-overview.png`，保留两组身份、验收状态、三个关键指标及单轮限制提示。不要只截“下降百分比”而裁掉背景。

**可选截图 ④：** `04-evidence.png`，展示测试输出及 Git 差异，证明不是仅仅生成了一份漂亮报告。

没有两边都通过时也如实保存报告；查看 Agent failures、测试输出和 Git 证据，不要将失败结果标成成功。`winner: undetermined` 或单轮无法计算置信区间并不表示运行失败；一对样本本来就不能给出稳定排名。

## 6. 导出、保存和补全记录

在报告上方分别点击：

- **Download report · HTML**：完整可读报告。
- **Evidence · JSON**：详细证据，原样保留方便排查。
- **PNG card**：适合文章或 README 的摘要图；也可保存 SVG card。

下载到浏览器默认目录后，移入脚本打印的本轮素材目录。保留原始文件名，在 `run-notes.md` 填写文件名、日期、版本、模型、真实结果和异常情况。不要用后来重跑的数据替换第一次截图而不说明。

审核后将报告复制到 [`results/`](results/README.md)，并改成稳定、可读的文件名；原始导出时间戳文件名不属于证据语义。

再在**源工作区**执行：

```bash
node --test
git status --short
```

预期仍然是 **1 pass / 4 fail**，Git 状态仍干净：修复发生在两份临时副本，而不是源工作区。这一步是确认隔离副本工作流程，不是在宣称安全沙箱。临时副本清理后，修复内容应从导出的 Git 差异查看，不能指望临时路径继续存在。

想再跑一遍：回到 dsh-plugin-compare 根目录，重新执行 `node example/prepare.mjs`，使用新工作区和新素材目录。不要修改仓库内的固定故障样例。想观察波动可以另外运行 3–5 对，但会运行 6–10 个 Agent，并产生额外模型消耗。

## 7. 审核后放入公开 repo

**先存 `captures/`，不要直接提交原始导出。** 自动脱敏覆盖不完整，`matches: 0` 不代表没有敏感信息。检查截图、代码差异、命令输出、账号信息、密钥、私人 URL 和本机绝对路径。

审核后的图片副本放入 [screenshots/](screenshots/README.md)，报告副本放入 [results/](results/README.md)。记录哪些内容被遮盖或补充，但不要改变测量值。复现产生的新原始材料应先放在 Git 忽略的 `captures/` 中。

最终可以说：“这次运行中，两组通过了现有验收测试，报告记录了它们的执行差异。”不能仅凭这个例子说“该插件稳定更强／省钱”：Token 包括缓存活动，不等于费用；单轮结果和测试覆盖也有局限。
