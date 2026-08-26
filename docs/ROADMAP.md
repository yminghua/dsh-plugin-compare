# Roadmap

## M0 — Workspace skeleton

- Installable DSH bundle
- Host event collector
- Deterministic comparison and redaction core
- Web entry point and empty comparison panel
- Build, tests, package smoke check, CI

## M1 — Compare two existing sessions

- [x] Session list and selection
- [x] Session-log metric projection
- [x] Token, duration, step, tool failure, and retry metrics
- [x] Baseline/candidate scorecard
- [x] Redacted, self-contained JSON and HTML export

## M2 — Replay and proof cards

- [x] Synchronized split-screen timeline
- [x] Persisted `write` / `edit` file-diff evidence
- [ ] Git tree snapshot evidence (requires capture during a controlled run)
- [x] SVG/PNG README card
- [x] Redaction preview and export manifest

## M3 — Controlled A/B runs

- Isolated workspace copies
- Baseline and candidate profile selection
- Scripted success checks
- Repeat trials and uncertainty display
- GitHub Action and compatibility matrix
