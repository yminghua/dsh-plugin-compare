import test from 'node:test'
import assert from 'node:assert/strict'
import { loadProofOptions } from '../src/client/options.ts'

for (const failed of ['list', 'presets', 'models']) {
  test(`options retain successful lists when ${failed} fails`, async () => {
    const values = { list: { sessions: [{ sessionId: 's', cwd: '/demo' }], total: 1 }, presets: { presets: [{ id: 'base' }] }, models: { providers: [{ id: 'deepseek', models: [] }] } }
    const ctx = { connection: { rpc: { async call(channel, method) {
      assert.equal(channel, '/dsh-proof')
      if (method === failed) return { ok: false, error: { code: 'internal', message: 'original failure', details: {} } }
      return { ok: true, value: values[method] }
    } } } }
    const result = await loadProofOptions(ctx)
    for (const [method, key] of [['list', 'sessions'], ['presets', 'presets'], ['models', 'models']]) {
      assert.equal(result[key].status, method === failed ? 'rejected' : 'fulfilled')
      if (method !== failed) assert.deepEqual(result[key].value, values[method])
    }
    assert.deepEqual(result.errors, [`${{ list: 'Sessions', presets: 'Presets', models: 'Models' }[failed]}: original failure`])
  })
}

test('options label transport exceptions without rejecting other lists', async () => {
  const result = await loadProofOptions({ connection: { rpc: { async call(_channel, method) {
    if (method === 'models') throw new Error('transport offline')
    return { ok: true, value: {} }
  } } } })
  assert.equal(result.sessions.status, 'fulfilled')
  assert.equal(result.presets.status, 'fulfilled')
  assert.deepEqual(result.errors, ['Models: transport offline'])
})
