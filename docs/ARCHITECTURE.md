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
src/client/              Session picker, split replay, proof-card UI
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
