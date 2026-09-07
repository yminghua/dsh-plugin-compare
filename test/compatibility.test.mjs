import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const compatibility = JSON.parse(await readFile(new URL('compatibility.json', root), 'utf8'))
const ciWorkflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8')
const releaseWorkflow = await readFile(new URL('.github/workflows/release.yml', root), 'utf8')

test('compatibility manifest stays aligned with package and CI', () => {
  assert.equal(compatibility.dsh.declared, packageJson.dsh.compatibility.dsh)
  assert.equal(compatibility.node.declared, packageJson.engines.node)
  assert.ok(compatibility.dsh.ci.includes(compatibility.dsh.minimum))
  assert.ok(compatibility.dsh.ci.includes('latest'))
  for (const version of compatibility.dsh.ci) assert.match(ciWorkflow, new RegExp(`dsh: ${version.replaceAll('.', '\\.')}`))
  assert.match(ciWorkflow, /scripts\/smoke-dsh\.mjs/)
})

test('release workflow selects next for prereleases and latest for stable versions', () => {
  assert.match(releaseWorkflow, /version\.includes\("-"\) \? "next" : "latest"/)
  assert.match(releaseWorkflow, /npm install --global npm@11\.16\.0/)
  assert.match(releaseWorkflow, /npm publish --provenance --tag "\$\{\{ steps\.npm-dist-tag\.outputs\.tag \}\}"/)
  assert.match(releaseWorkflow, /is already published; skipping npm publish/)
  assert.match(releaseWorkflow, /gh release create "\$GITHUB_REF_NAME"/)
  assert.match(releaseWorkflow, /args\+=\(--prerelease\)/)
  assert.match(releaseWorkflow, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/)
})
