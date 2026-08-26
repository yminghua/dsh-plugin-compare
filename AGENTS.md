# dsh-proof contributor notes

## Product boundary

`dsh-proof` compares evidence from DeepSeek Harness runs. It must not silently claim that one plugin is better from a single noisy run. Keep measured facts, user judgments, and model judgments visibly separate.

## Architecture

- `src/core/` is deterministic, DSH-independent domain logic. Do not import React, Cordis, filesystem, or network modules there.
- `src/index.ts` is the Host adapter. It may listen to DSH events and expose bounded services, but it must not contain comparison math.
- `src/client/` is the Web UI bundle. It communicates with the Host through explicit typed boundaries; do not read session files directly in the browser.
- Redaction happens before export. Canonical DSH session logs are never modified.

## Quality gates

Run `pnpm verify` before shipping. Add fixtures for every new event shape and tests for every metric or redaction rule.
