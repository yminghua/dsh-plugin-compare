# Releasing

Releases are published to the public npm registry by `.github/workflows/release.yml`. Do not publish from a developer checkout.

## Prerequisites

- The GitHub repository is public and has the `dsh-plugin` topic. Public visibility is also required for npm provenance and ecosystem indexing.
- The GitHub repository has an `NPM_TOKEN` repository secret with publish access.
- `main` is green for both the minimum and latest DSH compatibility lanes.
- Public example artifacts have been reviewed for credentials, account data, and machine-local paths.

For the first npm release, create a write-capable npm token for the package owner and save it at GitHub **Settings → Secrets and variables → Actions → New repository secret** with the exact name `NPM_TOKEN`. GitHub only exposes the secret name after creation, never its value. After the package exists, migrate to npm trusted publishing when practical so the release uses short-lived OIDC credentials instead of a long-lived write token.

The workflow selects npm dist-tags from the package version: versions containing a prerelease suffix publish to `next`; stable versions publish to `latest`. npm may create `latest` automatically for the first package version even when another tag was requested. If that first version is a prerelease, a maintainer must remove the accidental tag interactively with `npm dist-tag rm <package> latest`; npm protects `latest`, so the CI publishing token cannot perform this cleanup. Never publish an alpha, beta, or release candidate as `latest`.

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

6. Dry-run the same dist-tag the workflow will use: `npm publish --dry-run --tag next` for a prerelease or `npm publish --dry-run --tag latest` for a stable release.
7. Merge the release commit to `main`, create the matching `v<version>` tag, and push the tag. The tag must exactly match the package version.

The workflow reruns verification and publishes with npm provenance. A failed job can be retried from the tagged workflow run. Publishing is the only irreversible step; creating a tarball or running the smoke test does not publish anything. After a successful prerelease, verify that `npm view dsh-plugin-compare dist-tags --registry=https://registry.npmjs.org` reports `next` and does not move `latest`.
