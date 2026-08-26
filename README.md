# dsh-proof

> Don't trust the README. Run the proof.

`dsh-proof` is a DeepSeek Harness plugin for comparing a baseline agent run with a plugin-enabled run. It turns session evidence into a split replay, measurable deltas, and a shareable proof card.

中文文档: [README.zh.md](./README.zh.md)

## Status

Alpha. The Web `Proof` panel can compare two existing sessions or run a controlled baseline/candidate pair. Controlled runs copy the source workspace twice, compose the selected agent preset in each copy, submit the same prompt, optionally execute the same success-check command, and capture runtime Git evidence. Reports include synchronized timelines, persisted file diffs, explicit check outcomes, and redacted JSON, self-contained HTML, SVG, or PNG exports. See [the roadmap](./docs/ROADMAP.md).

Historical sessions only expose `write` / `edit` diffs persisted in the canonical log. Runtime Git status and tracked diffs are available only for controlled runs, where they are captured before the temporary copies are removed.

The current controlled runner executes one sequential pair. It explicitly labels that result as evidence rather than a statistically reliable ranking; repeat trials and uncertainty estimates are the next milestone. Dependency directories are excluded from copies, external symlinks are refused, and Git worktree pointer files are not copied back into the experiment.

## Planned evidence

- Task outcome and explicit test result
- Tokens, cost, time, steps, retries, and tool failures
- Explicit test results and controlled-run Git snapshots
- Repeat trials and uncertainty display

## Development

Requirements: Node.js 22.19+ and pnpm 11.19.

```bash
pnpm install
pnpm verify
```

Install a local checkout into DSH Web:

```bash
dsh plugin --profile web add link:/absolute/path/to/dsh-proof
dsh web
```

The repository targets DSH `0.1.1-rc.2` or newer compatible `0.1.x` builds. DeepSeek Harness is still in developer preview, so every release must be tested against the current published build.

## Architecture

The package keeps deterministic comparison logic in `src/core`, DSH Host integration in `src/index.ts`, and the browser bundle in `src/client`. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## License

MIT
