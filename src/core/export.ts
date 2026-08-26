import type { ProofComparison } from './types.ts'
import { redactSecrets } from './redact.ts'

export interface ProofReport {
  schemaVersion: 1
  generatedAt: string
  disclaimer: string
  comparison: ProofComparison
}

export function createProofReport(comparison: ProofComparison, generatedAt = new Date().toISOString()): ProofReport {
  return {
    schemaVersion: 1,
    generatedAt,
    disclaimer: 'Measured execution facts are not a task-success judgment. Repeated controlled trials may be required.',
    comparison,
  }
}

export function serializeProofReport(report: ProofReport): string {
  return redactSecrets(JSON.stringify(report, null, 2)).text
}

export function renderProofHtml(report: ProofReport): string {
  const safe = JSON.parse(serializeProofReport(report)) as ProofReport
  const { baseline, candidate, deltas } = safe.comparison
  const rows: Array<[string, string, string]> = [
    ['Execution', baseline.metrics.execution, candidate.metrics.execution],
    ['Task outcome', baseline.metrics.outcome, candidate.metrics.outcome],
    ['Tokens', integer(deltas.totalTokens.baseline), integer(deltas.totalTokens.candidate)],
    ['Active time', duration(deltas.durationMs.baseline), duration(deltas.durationMs.candidate)],
    ['Steps', integer(deltas.steps.baseline), integer(deltas.steps.candidate)],
    ['Tool calls', integer(deltas.toolCalls.baseline), integer(deltas.toolCalls.candidate)],
    ['Tool failures', integer(deltas.failedToolCalls.baseline), integer(deltas.failedToolCalls.candidate)],
    ['Retries', integer(deltas.retries.baseline), integer(deltas.retries.candidate)],
  ]
  const body = rows.map(([label, before, after]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(before)}</td><td>${escapeHtml(after)}</td></tr>`).join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DSH Proof · ${escapeHtml(baseline.label)} vs ${escapeHtml(candidate.label)}</title>
<style>body{margin:0;background:#0b1020;color:#e8ecf7;font:15px/1.5 ui-sans-serif,system-ui,sans-serif}.wrap{max-width:820px;margin:48px auto;padding:0 20px}.card{border:1px solid #29324d;border-radius:18px;background:#121a2e;overflow:hidden;box-shadow:0 24px 80px #0008}.head{padding:24px;border-bottom:1px solid #29324d}.eyebrow{color:#8fa5d9;font-size:12px;text-transform:uppercase;letter-spacing:.12em}h1{margin:6px 0 0;font-size:25px}.note{margin:18px 0;padding:12px 14px;border-radius:10px;background:#1a2542;color:#b8c3df;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:12px 18px;border-top:1px solid #29324d;text-align:right}th:first-child{text-align:left;color:#aeb9d3;font-weight:500}thead th{border-top:0;background:#17213a;color:#8fa5d9;font-size:12px}footer{padding:16px 24px;color:#7784a5;font-size:12px}</style></head>
<body><main class="wrap"><section class="card"><header class="head"><div class="eyebrow">DSH Proof · measured facts</div><h1>${escapeHtml(baseline.label)} <span aria-hidden="true">→</span> ${escapeHtml(candidate.label)}</h1><p class="note">${escapeHtml(safe.disclaimer)}</p></header><table><thead><tr><th>Metric</th><th>Baseline</th><th>Candidate</th></tr></thead><tbody>${body}</tbody></table><footer>Generated ${escapeHtml(safe.generatedAt)} · Schema v${safe.schemaVersion}</footer></section></main></body></html>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

function integer(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function duration(value: number): string {
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`
}
