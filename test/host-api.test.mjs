import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { apply } from '../lib/index.js'

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
})
