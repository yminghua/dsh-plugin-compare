import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const compatibility = JSON.parse(await readFile(new URL('compatibility.json', root), 'utf8'))
const workflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8')

test('compatibility manifest stays aligned with package and CI', () => {
  assert.equal(compatibility.dsh.declared, packageJson.dsh.compatibility.dsh)
  assert.equal(compatibility.node.declared, packageJson.engines.node)
  assert.ok(compatibility.dsh.ci.includes(compatibility.dsh.minimum))
  assert.ok(compatibility.dsh.ci.includes('latest'))
  for (const version of compatibility.dsh.ci) assert.match(workflow, new RegExp(`dsh: ${version.replaceAll('.', '\\.')}`))
  assert.match(workflow, /scripts\/smoke-dsh\.mjs/)
})
