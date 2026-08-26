# dsh-proof

> Don't trust the README. Run the proof.

`dsh-proof` is a DeepSeek Harness plugin for comparing a baseline agent run with a plugin-enabled run. It turns session evidence into a split replay, measurable deltas, and a shareable proof card.

中文文档: [README.zh.md](./README.zh.md)

## Status

Alpha. The Web `Proof` panel can select two existing sessions, compare recorded execution facts, scrub synchronized timelines, inspect persisted file diffs, and download redacted JSON, self-contained HTML, SVG, or PNG evidence. See [the roadmap](./docs/ROADMAP.md).

Historical sessions only expose `write` / `edit` diffs persisted in the canonical log. The plugin does not misrepresent the current workspace as historical Git evidence; Git tree snapshots are reserved for controlled A/B capture.

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
