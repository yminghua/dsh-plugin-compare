import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPresetIdentity } from '../src/host/identity.ts'

test('identifies copied preset bundles from registration metadata, not their display names', async () => {
  const root = await mkdtemp(join(tmpdir(), 'comparison-identity-'))
  const preset = { id: 'expert-mode', name: '专家模式 v0.9.2', path: join(root, 'agent.cordis.yml') }
  try {
    await writeFile(preset.path, '[]')
    assert.deepEqual(await readPresetIdentity(preset), { presetId: preset.id, presetName: preset.name })
    await writeFile(join(root, 'cordis.patch.yml'), '- insert:\n  - id: arbitrary\n    name: dsh-expert-mode\n')
    await writeFile(join(root, 'preset.yml'), 'version: "0.9.2"\n')
    const identity = await readPresetIdentity(preset)
    assert.equal(identity.plugin, 'dsh-expert-mode')
    assert.equal(identity.pluginVersion, '0.9.2')
    assert.equal(identity.pluginSource, 'preset-registration')
    await writeFile(join(root, 'cordis.patch.yml'), '- insert:\n  - name: first-plugin\n  - name: second-plugin\n')
    assert.equal((await readPresetIdentity(preset)).plugin, undefined, 'ambiguous bundles must not pick the first plugin')
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@example/verified', version: '1.2.3' }))
    assert.equal((await readPresetIdentity(preset)).plugin, '@example/verified')
    assert.equal((await readPresetIdentity(preset)).pluginSource, 'package-manifest')
    await writeFile(join(root, 'package.json'), 'x'.repeat(65_000))
    assert.equal((await readPresetIdentity(preset)).plugin, undefined)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('missing metadata never breaks preset loading', async () => {
  assert.deepEqual(await readPresetIdentity({ id: 'standard' }), { presetId: 'standard', presetName: 'standard' })
  assert.equal((await readPresetIdentity({ id: 'expert-mode', name: 'dsh-expert-mode', path: '/missing/comparison-test.yml' })).plugin, undefined)
})
