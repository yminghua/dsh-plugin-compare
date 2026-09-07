# Compatibility

The machine-readable contract lives in [`compatibility.json`](../compatibility.json). The package currently declares DeepSeek Harness `>=0.1.1-rc.2 <0.2.0` and Node.js `>=22.19.0`.

| CI channel | DSH selector | Purpose |
| --- | --- | --- |
| Minimum | `0.1.1-rc.2` | Prevent accidentally raising the supported baseline |
| Latest | `latest` | Detect a newly published compatible DSH build without waiting for a dependency PR |

As checked on 2026-09-07, npm's `latest` and `next` tags resolve to `0.1.2-rc.1`. The minimum lane remains on `0.1.1-rc.2`, so CI exercises both compatibility boundaries.

Each compatibility job builds the package and runs:

```bash
pnpm smoke:dsh -- <version-or-tag>
```

The smoke script creates a fresh temporary `DSH_HOME`, installs the package selected by `--plugin` (or this checkout by default) into the Web profile, boots DSH on an OS-assigned loopback port, performs the launch-token/cookie exchange when required by newer DSH versions, verifies that the boot manifest contains `dsh-plugin-compare` with the expected client injections, fetches its manifest-declared client bundle, then stops the Host and removes the temporary profile. CI passes a freshly packed tarball so it tests the files users would actually install.

Public CI does not run a real model-backed controlled comparison because that would require credentials, consume tokens, and introduce provider noise. The controlled runner itself is covered by deterministic Host tests; model-backed trials remain an explicit local action.
