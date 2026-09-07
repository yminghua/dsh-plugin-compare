import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { apply } from '../lib/index.js'
import { inject } from '../lib/index.js'
import { Context } from '@deepseek-ai/cordis'

const fixtures = JSON.parse(await readFile(new URL('./fixtures/sessions.json', import.meta.url), 'utf8'))

function record(fixture, live = false) {
  return { header: { id: fixture.id, cwd: fixture.cwd, createdAt: fixture.createdAt }, live, persisted: true }
}

test('Host RPC lists and compares sessions through sessionQuery', async () => {
  let rpcHandler
  let sessionListener
  const all = [fixtures.candidate, fixtures.baseline]
  const ctx = {
    connection: { rpc: { handle(channel, handler, options) {
      assert.equal(channel, '/dsh-proof')
      assert.deepEqual(options, { authority: 'trusted-host' })
      rpcHandler = handler
      return async () => {}
    } } },
    sessionQuery: {
      async listSessions() { return all.map((fixture, index) => record(fixture, index === 0)) },
      async readSession(id) { return { events: all.find((fixture) => fixture.id === id).events } },
      async readTitleSnapshots(ids) { return ids.map((id) => ({ sessionId: id, status: 'fulfilled', value: { title: { title: all.find((fixture) => fixture.id === id).title } } })) },
    },
    on(event, listener) { assert.equal(event, 'session/event'); sessionListener = listener; return () => {} },
    effect(register) { register(); return () => {} },
  }

  apply(ctx, { maxRuns: 20 })
  assert.equal(typeof sessionListener, 'function')
  assert.equal(typeof rpcHandler, 'function')
  const signal = new AbortController().signal
  const listed = await rpcHandler('list', { limit: 10 }, signal)
  assert.equal(listed.ok, true)
  assert.equal(listed.value.total, 2)
  assert.equal(listed.value.sessions[0].title, 'Candidate run')
  const compared = await rpcHandler('compare', { baselineId: fixtures.baseline.id, candidateId: fixtures.candidate.id }, signal)
  assert.equal(compared.ok, true)
  assert.equal(compared.value.comparison.winner, 'undetermined')
  assert.equal(compared.value.comparison.deltas.totalTokens.baseline, 1350)
  assert.equal(compared.value.comparison.deltas.totalTokens.candidate, 600)
  assert.equal(compared.value.comparison.baseline.metrics.changedFiles, 1)
  assert.equal(compared.value.evidence.baseline.timeline.length, fixtures.baseline.events.length)
  assert.equal(compared.value.evidence.baseline.fileDiffs[0].path, 'src/config.ts')
})

for (const withDefault of [true, false]) {
  test(`models RPC works through real Cordis with default service ${withDefault ? 'present' : 'absent'}`, async () => {
    const root = new Context()
    let handler
    root.provide('connection', { rpc: { handle(_channel, callback) { handler = callback; return async () => {} } } })
    root.provide('llm', {
      listProviders() { return [{ id: 'deepseek', name: 'DeepSeek' }] },
      async listModels() { return [{ id: 'chat', name: 'Chat' }] },
    })
    for (const name of ['sessionQuery', 'agents', 'sessions', 'agentPresets']) root.provide(name, {})
    if (withDefault) root.provide('agentDefaultModel', { currentSelection() { return { provider: 'deepseek', model: 'chat' } } })
    try {
      await root.plugin({ inject, apply(ctx) { apply(ctx, {}) } })
      assert.equal(typeof handler, 'function')
      const result = await handler('models', {}, new AbortController().signal)
      assert.equal(result.ok, true, JSON.stringify(result))
      assert.equal(result.value.providers[0].models[0].id, 'chat')
      assert.deepEqual(result.value.defaultSelection, withDefault ? { provider: 'deepseek', model: 'chat' } : undefined)
      const failed = await handler('unknown', {}, new AbortController().signal)
      assert.deepEqual(failed, { ok: false, error: { code: 'internal', message: 'Unknown endpoint: unknown', details: {} } })
      const thrown = await handler('list', {}, new AbortController().signal)
      assert.equal(thrown.ok, false)
      assert.equal(thrown.error.code, 'internal')
      assert.deepEqual(thrown.error.details, {})
      assert.match(thrown.error.message, /listSessions/)
    } finally {
      await root.fiber.dispose()
    }
  })
}
