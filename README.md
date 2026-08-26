# dsh-proof

> Don't trust the README. Run the proof.

`dsh-proof` is a DeepSeek Harness plugin for comparing a baseline agent run with a plugin-enabled run. It turns session evidence into a split replay, measurable deltas, and a shareable proof card.

中文文档: [README.zh.md](./README.zh.md)

## Status

Alpha. The Web `Proof` panel can select two existing sessions, compare recorded execution facts, and download redacted JSON or self-contained HTML evidence. See [the roadmap](./docs/ROADMAP.md).

## Planned evidence

- Task outcome and explicit test result
- Tokens, cost, time, steps, retries, and tool failures
- Tool trajectory and Git diff
- Synchronized before/after replay
- Redacted HTML, JSON, SVG, and PNG exports

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
