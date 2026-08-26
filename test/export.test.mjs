import test from 'node:test'
import assert from 'node:assert/strict'
import { compareRuns, createProofReport, renderProofHtml, renderProofSvg, serializeProofReport } from '../lib/core/index.js'

function run(id, label) {
  return {
    id,
    label,
    capturedAt: '2026-08-26T00:00:00.000Z',
    metrics: {
      outcome: 'unknown', execution: 'completed', durationMs: 1200, turns: 1, steps: 2,
      toolCalls: 1, failedToolCalls: 0, retries: 0,
      tokens: { input: 100, output: 20, cacheRead: 0, cacheWrite: 0 },
    },
  }
}

test('exports redacted JSON and escaped standalone HTML', () => {
  const baseline = run('before', '<script>alert(1)</script> Bearer abcdefghijklmnopqrstuvwxyz')
  const candidate = run('after', 'Candidate')
  const evidence = {
    baseline: { sessionId: 'before', timeline: [], fileDiffs: [{ seq: 1, path: 'config.ts', oldText: null, newText: 'Bearer abcdefghijklmnopqrstuvwxyz' }] },
    candidate: { sessionId: 'after', timeline: [], fileDiffs: [] },
  }
  const report = createProofReport(compareRuns(baseline, candidate), evidence, '2026-08-26T00:00:00.000Z')
  const json = serializeProofReport(report)
  assert.doesNotMatch(json, /abcdefghijklmnopqrstuvwxyz/)
  assert.match(json, /REDACTED:bearer_token/)
  assert.equal(JSON.parse(json).exportManifest.redaction.matches, 2)
  const html = renderProofHtml(report)
  assert.match(html, /^<!doctype html>/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;alert/)
  assert.match(html, /Recorded file evidence/)
  const svg = renderProofSvg(report)
  assert.match(svg, /^<svg /)
  assert.doesNotMatch(svg, /abcdefghijklmnopqrstuvwxyz/)
  assert.match(svg, /winner: undetermined/)
})
