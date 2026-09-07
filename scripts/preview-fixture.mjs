// Entirely synthetic, non-private visual QA data. Never reads user reports.
import { mkdir, writeFile } from 'node:fs/promises'
import { compareRuns, createComparisonReport, serializeComparisonReport, summarizeExperiment } from '../lib/core/index.js'

const variant = (id, plugin, time, tokens, calls) => ({
  id, label: `${id} demo preset`, presetId: id, presetName: id === 'baseline' ? 'Standard demo' : '示例质量模式',
  ...(plugin ? { plugin, pluginVersion: '1.2.3', pluginSource: 'package-manifest' } : {}),
  model: 'example-model', provider: 'example-provider', capturedAt: '2026-01-01T00:00:00Z',
  metrics: { outcome: 'pass', execution: 'completed', durationMs: time, turns: 1, steps: calls,
    toolCalls: calls, failedToolCalls: 0, retries: 0, changedFiles: 1,
    tokens: { input: tokens, output: 100, cacheRead: 200, cacheWrite: 0 } },
  check: { command: 'example-test', status: 'pass', exitCode: 0, durationMs: 100, output: 'Synthetic fixture: 5 checks passed. No real code was executed.' },
})
const comparison = compareRuns(variant('baseline', undefined, 100_000, 1000, 10), variant('candidate', 'example-quality-plugin', 80_000, 700, 8))
const evidence = { baseline: { sessionId: 'baseline', timeline: [], fileDiffs: [] }, candidate: { sessionId: 'candidate', timeline: [], fileDiffs: [] } }
const report = createComparisonReport(comparison, evidence, '2026-01-01T00:00:00Z', summarizeExperiment([comparison]))
await mkdir('reports/synthetic', { recursive: true })
await writeFile('reports/synthetic/input.json', serializeComparisonReport(report), { flag: 'wx' })
