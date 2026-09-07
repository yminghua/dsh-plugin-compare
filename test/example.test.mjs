import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

test('checkout example stays intentionally broken and preparation creates independent clean Git workspaces', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'proof-example-test-'))
  try {
    const prepare = () => JSON.parse(execFileSync(process.execPath, ['example/prepare.mjs', '--output-root', parent, '--json'], { cwd: root, encoding: 'utf8' }))
    const first = prepare()
    const second = prepare()
    assert.notEqual(first.sourceDir, second.sourceDir)
    assert.notEqual(first.captureDir, second.captureDir)
    assert.equal(execFileSync('git', ['-C', first.sourceDir, 'status', '--short'], { encoding: 'utf8' }), '')
    assert.equal(execFileSync('git', ['-C', first.sourceDir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(), first.sourceDir)
    assert.equal(await readFile(join(first.sourceDir, 'src/checkout.mjs'), 'utf8'), await readFile(join(root, 'example/checkout/src/checkout.mjs'), 'utf8'))
    // This fixture needs its own test runner, not the parent runner's child context.
    const fixtureEnv = { ...process.env }
    delete fixtureEnv.NODE_TEST_CONTEXT
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], { cwd: first.sourceDir, encoding: 'utf8', env: fixtureEnv })
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stdout, /# tests 5/)
    assert.match(result.stdout, /# pass 1/)
    assert.match(result.stdout, /# fail 4/)
    const notes = await readFile(join(first.captureDir, 'run-notes.md'), 'utf8')
    assert.ok(notes.includes(first.sourceHead))
    assert.ok(notes.includes(first.sourceDir))
    assert.doesNotMatch(notes, /\{\{SOURCE_|\{\{PROOF_/)
  } finally { await rm(parent, { recursive: true, force: true }) }
})
