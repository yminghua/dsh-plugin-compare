# Architecture

The repository intentionally ships as one npm package. DSH users get one install command, while the source stays split across three boundaries:

```text
DSH session/event stream
        │
        ▼
src/index.ts             Host adapter and bounded capture
        │
        ▼
src/core/                Deterministic fold, compare, redact, export model
        │
        ▼
src/client/              Session picker, split replay, comparison-card UI
```

## Why not a monorepo yet?

The initial product has one release unit and one consumer: a DSH Web profile. Splitting packages now would make Git installation, peer dependency resolution, and versioning harder without creating a real ownership boundary. A CLI or GitHub Action can become a second package later because `src/core/` already has no DSH dependency.

## Trust model

- Measurements are derived from immutable session events and explicit test results.
- A/B runs remain distinct records; reports never rewrite source sessions.
- Secret redaction is default-on for exports.
- File evidence comes only from persisted `tool/result.meta.diffs`; the browser never reads workspace files.
- Export manifests state the source, included evidence counts, and redaction matches.
- Unknown metrics stay unknown instead of being inferred from missing data.
- A single run is evidence, not statistical proof. Repeated trials will be modeled explicitly.

## Controlled-run boundary

- The trusted Host resolves the configured provider/model catalog, passes one explicit route to both Agents, creates two temporary filesystem copies, and runs both variants with the same prompt while alternating order across pairs.
- `node_modules`, `.pnpm-store`, and prior comparison-run directories are excluded. Internal symlinks are dereferenced; external symlinks are rejected.
- A regular `.git` directory is copied for isolated status/diff capture. A Git worktree `.git` pointer file is omitted so an experiment cannot address the source repository's Git metadata.
- The optional success command is an explicit user-authored judgment. Its exit status sets `outcome`; agent completion remains a separate `execution` fact.
- A success command runs only after the Agent completes. Startup/execution failures are preserved as structured report evidence, leave outcome unknown, and make the comparison explicitly invalid.
- Temporary copies are removed after their session, check, file-diff, and Git evidence has been projected into the report model.
- A request runs 1–10 fresh pairs and alternates first-run order. Statistics use candidate-minus-baseline paired deltas and a two-sided Student-t 95% interval for two or more pairs.
- Every aggregate retains compact raw observations and Session ids. The interval is descriptive under a small-sample assumption; it never changes the single-pair `winner` field or asserts causality.
