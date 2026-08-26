import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionQueryEngine } from '@deepseek-ai/dsh-session-query'

test('uses methods shipped by the current SessionQuery service', () => {
  const methods = Object.getOwnPropertyNames(SessionQueryEngine.prototype)
  for (const method of ['listSessions', 'readSession', 'readTitleSnapshots']) {
    assert.ok(methods.includes(method), `${method} must exist on SessionQueryEngine`)
  }
})
