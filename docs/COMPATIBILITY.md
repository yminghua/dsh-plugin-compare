# Compatibility

The machine-readable contract lives in [`compatibility.json`](../compatibility.json). The package currently declares DeepSeek Harness `>=0.1.1-rc.2 <0.2.0` and Node.js `>=22.19.0`.

| CI channel | DSH selector | Purpose |
| --- | --- | --- |
| Minimum | `0.1.1-rc.2` | Prevent accidentally raising the supported baseline |
| Latest | `latest` | Detect a newly published compatible DSH build without waiting for a dependency PR |

As checked on 2026-08-27, npm's `latest` and `next` tags both resolve to `0.1.1-rc.2`. The two jobs are intentionally kept separate: they become different automatically when DSH publishes another release.

Each compatibility job builds the package and runs:

```bash
pnpm smoke:dsh -- <version-or-tag>
```

The smoke script creates a fresh temporary `DSH_HOME`, installs this checkout into the Web profile, boots DSH on an OS-assigned loopback port, verifies that the boot manifest contains `dsh-proof` with the expected client injections, fetches the client bundle, then stops the Host and removes the temporary profile.

Public CI does not run a real model-backed controlled comparison because that would require credentials, consume tokens, and introduce provider noise. The controlled runner itself is covered by deterministic Host tests; model-backed trials remain an explicit local action.
