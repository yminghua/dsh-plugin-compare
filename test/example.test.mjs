import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

test('checkout example stays intentionally broken and preparation creates independent clean Git workspaces', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'comparison-example-test-'))
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
    assert.doesNotMatch(notes, /\{\{SOURCE_|\{\{COMPARE_/)
  } finally { await rm(parent, { recursive: true, force: true }) }
})

test('published checkout example text artifacts contain no machine-local paths', async () => {
  const files = []
  for (const directory of ['example/screenshots', 'example/results']) {
    for (const entry of await readdir(join(root, directory))) {
      if (/\.(?:html|json|md|svg)$/.test(entry)) files.push(join(directory, entry))
    }
  }
  for (const file of files) {
    const contents = await readFile(join(root, file), 'utf8')
    assert.doesNotMatch(contents, /\/Users\/|\/(?:private\/)?var\/folders\/|Pprojects\/DSH-Plugins|dsh-plugin-compare-run-[A-Za-z0-9]+/, file)
    if (file.endsWith('.json')) JSON.parse(contents)
  }
})

test('npm package keeps the runnable example but excludes heavyweight evidence assets', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'comparison-pack-test-'))
  try {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NPM_CONFIG_CACHE: cache },
    })
    const [{ files, size, unpackedSize }] = JSON.parse(output)
    const paths = files.map(({ path }) => path)
    assert.ok(paths.includes('example/checkout/src/checkout.mjs'))
    assert.ok(paths.includes('example/results/checkout-demo.html'))
    assert.ok(paths.includes('example/results/checkout-demo.svg'))
    assert.ok(paths.includes('example/readme-demo.png'))
    assert.ok(!paths.some((path) => /^example\/screenshots\/.*\.png$/.test(path)))
    assert.ok(!paths.includes('example/results/checkout-demo.json'))
    assert.ok(!paths.includes('example/results/checkout-demo.png'))
    assert.ok(size < 1_000_000, `expected packed size below 1 MB, received ${size}`)
    assert.ok(unpackedSize < 1_000_000, `expected unpacked size below 1 MB, received ${unpackedSize}`)
  } finally { await rm(cache, { recursive: true, force: true }) }
})
