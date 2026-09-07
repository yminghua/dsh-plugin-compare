# Public screenshots

This directory is reserved for reviewed screenshots from the checkout walkthrough.

Capture originals in the ignored `example/captures/<run>/` directory printed by `prepare.mjs`.
The next recording should publish:

1. `initial-tests.md` — complete initial test transcript: 5 tests, 1 pass, 4 fail.
2. `01-controlled-config.png` — same model, two presets, one pair, `node --test`.
3. `02-running.png` — actual pair / variant / phase / elapsed time.
4. `03-result-overview.png` — plugin identity, check outcomes and measured deltas.

No recorded assets are currently published: the previous set used the old product name and was removed before the rename. New captures should first go in the ignored `example/captures/<run>/` directory printed by `prepare.mjs`; mask local paths and review every value before publication without editing measurements.
