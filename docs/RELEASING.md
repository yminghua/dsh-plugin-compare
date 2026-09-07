# Releasing

Releases are published to the public npm registry by `.github/workflows/release.yml`. Do not publish from a developer checkout.

## Prerequisites

- The GitHub repository has an `NPM_TOKEN` repository secret with publish access.
- `main` is green for both the minimum and latest DSH compatibility lanes.
- Public example artifacts have been reviewed for credentials, account data, and machine-local paths.

## Prepare a release

1. Choose the version deliberately. Pre-releases use an explicit prerelease suffix, such as `0.1.0-alpha.1`.
2. Update `package.json` and the lockfile if the version changes.
3. Run `pnpm verify`.
4. Build a tarball with `pnpm pack --pack-destination <temporary-directory>` and inspect its file list. The locally generated `example/.work/` and `example/captures/` directories must not be present.
5. Run the packed artifact against both compatibility boundaries:

   ```bash
   node scripts/smoke-dsh.mjs 0.1.1-rc.2 --plugin /absolute/path/to/dsh-plugin-compare-<version>.tgz
   node scripts/smoke-dsh.mjs latest --plugin /absolute/path/to/dsh-plugin-compare-<version>.tgz
   ```

6. Merge the release commit to `main`, create the matching `v<version>` tag, and push the tag. The tag must exactly match the package version.

The workflow reruns verification and publishes with npm provenance. A failed job can be retried from the tagged workflow run. Publishing is the only irreversible step; creating a tarball or running the smoke test does not publish anything.
