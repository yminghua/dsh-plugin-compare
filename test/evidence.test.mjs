import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { projectSessionEvidence } from '../lib/core/index.js'

const fixtures = JSON.parse(await readFile(new URL('./fixtures/sessions.json', import.meta.url), 'utf8'))

test('projects a structural timeline and persisted file diff evidence', () => {
  const evidence = projectSessionEvidence(fixtures.baseline.id, fixtures.baseline.events)
  assert.equal(evidence.timeline.length, fixtures.baseline.events.length)
  assert.deepEqual(evidence.timeline[0], {
    seq: 0, time: 1000, elapsedMs: 0, type: 'turn/start', lane: 'turn', status: 'start', label: 'Turn 1 started',
  })
  assert.equal(evidence.timeline.at(-1).elapsedMs, 1000)
  assert.deepEqual(evidence.fileDiffs, [{
    seq: 4,
    path: 'src/config.ts',
    oldText: "export const token = 'old'",
    newText: "export const token = 'Bearer abcdefghijklmnopqrstuvwxyz'",
  }])
})
