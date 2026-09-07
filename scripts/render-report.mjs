// Re-render saved evidence without executing an Agent or overwriting its source.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderProofHtml, renderProofSvg, serializeProofReport, sanitizeProofReport } from '../lib/core/index.js'
import { ComparisonView } from '../src/client/index.ts'
import { proofStyles } from '../src/client/styles.ts'

const { values } = parseArgs({ options: {
  input: { type: 'string' }, out: { type: 'string' },
  'candidate-plugin': { type: 'string' }, 'candidate-version': { type: 'string' },
} })
if (!values.input || !values.out) throw new Error('Usage: node scripts/render-report.mjs --input report.json --out reports/preview [--candidate-plugin package-name --candidate-version version]')
const report = JSON.parse(await readFile(values.input, 'utf8'))
if (report.schemaVersion !== 2 || !report.comparison || !report.evidence) throw new Error('Expected a v2 report with comparison and evidence')
if (values['candidate-plugin']) {
  report.comparison.candidate.plugin = values['candidate-plugin']
  report.comparison.candidate.pluginSource = 'report-label'
  if (values['candidate-version']) report.comparison.candidate.pluginVersion = values['candidate-version']
}
const safe = sanitizeProofReport(report)
const prefix = resolve(values.out)
await mkdir(dirname(prefix), { recursive: true })
const preview = renderToStaticMarkup(React.createElement(ComparisonView, { comparison: safe.comparison, evidence: safe.evidence, experiment: safe.experiment }))
const ui = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>In-app report · static preview</title><style>:root{--dsw-alias-border-l2:#dde5e9;--dsw-alias-label-primary:#172b3a;--dsw-alias-label-secondary:#506571;--dsw-alias-label-tertiary:#637986;--dsw-alias-bg-layer-2:#f3f7f8;--dsw-alias-bg-layer-3:#fff;--dsw-alias-bg-module-platform:#edf5f4;--dsw-alias-brand-primary:#287e78;--dsw-alias-state-error-primary:#b33939}*{box-sizing:border-box}body{margin:0;background:#f2f5f7;color:#172b3a;font:14px/1.5 system-ui}main{max-width:820px;margin:28px auto;padding:18px;background:#fff;border:1px solid #dde5e9;border-radius:16px}header{font-size:12px;margin:0 0 16px;color:#506571}${proofStyles}</style></head><body><main><header>DSH Proof / In-app layout preview · saved evidence, no new run · download buttons inactive</header>${preview}</main></body></html>`
for (const [suffix, content] of [['.html', renderProofHtml(safe)], ['.svg', renderProofSvg(safe)], ['.json', serializeProofReport(safe)], ['.ui.html', ui]]) {
  await writeFile(`${prefix}${suffix}`, content, { flag: 'wx' })
  process.stdout.write(`${prefix}${suffix}\n`)
}
