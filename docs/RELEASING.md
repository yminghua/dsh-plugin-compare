# Releasing

Releases are published to the public npm registry by `.github/workflows/release.yml`. Do not publish from a developer checkout.

## Prerequisites

- The GitHub repository is public and has the `dsh-plugin` topic. Public visibility is also required for npm provenance and ecosystem indexing.
- The GitHub repository has an `NPM_TOKEN` repository secret with publish access.
- `main` is green for both the minimum and latest DSH compatibility lanes.
- Public example artifacts have been reviewed for credentials, account data, and machine-local paths.

For the first npm release, create a write-capable npm token for the package owner and save it at GitHub **Settings → Secrets and variables → Actions → New repository secret** with the exact name `NPM_TOKEN`. GitHub only exposes the secret name after creation, never its value. After the package exists, migrate to npm trusted publishing when practical so the release uses short-lived OIDC credentials instead of a long-lived write token.

### Migrate to trusted publishing

After the first release creates the npm package, open its npm **Settings → Trusted publishing**, add a GitHub Actions publisher, and enter these values exactly:

- Organization or user: `yminghua`
- Repository: `dsh-plugin-compare`
- Workflow filename: `release.yml`
- Environment: leave blank
- Allowed actions: enable direct `npm publish`

The release workflow grants `id-token: write`, installs an OIDC-capable npm CLI, and uses `npm publish`. Keep `NPM_TOKEN` only during the migration. After the trusted publisher is saved, remove `NODE_AUTH_TOKEN` from the workflow, verify the next release through OIDC, then delete the GitHub secret and revoke the npm token.

The workflow selects npm dist-tags from the package version: versions containing a prerelease suffix publish to `next`; stable versions publish to `latest`. npm requires every package document to retain a `latest` tag, so when the first and only published version is a prerelease, npm assigns both `next` and `latest` to it and rejects removal of `latest`. Accept this bootstrap state rather than publishing a fake stable placeholder. The first stable release moves `latest` to the stable version; later prereleases update only `next`. Never deliberately publish an alpha, beta, or release candidate with `--tag latest`.

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

The workflow reruns verification and publishes with npm provenance. A failed job can be retried from the tagged workflow run. Publishing is the only irreversible step; creating a tarball or running the smoke test does not publish anything. After a successful prerelease, verify that `npm view dsh-plugin-compare dist-tags --registry=https://registry.npmjs.org` reports `next`. If a stable release already exists, also verify that `latest` still points to that stable version; the first-release exception is described above.
