import React from 'react'
import { reportHeadline, reportMetricCards, runIdentity, type ComparisonReport, type ComparisonRun } from '../core/index.ts'

export function ReportOverview({ report }: { report: ComparisonReport }): React.ReactElement {
  const { baseline, candidate } = report.comparison
  const pairs = report.experiment?.trials
  return React.createElement('section', { className: 'dcompare-overview' },
    React.createElement('div', { className: 'dcompare-eyebrow' }, 'PLUGIN COMPARISON / DSH PLUGIN COMPARE'),
    React.createElement('h2', null, `${runIdentity(baseline).name} vs ${runIdentity(candidate).name}`),
    React.createElement('div', { className: 'dcompare-identities' },
      React.createElement(IdentityCard, { run: baseline, role: 'A · Baseline' }),
      React.createElement(IdentityCard, { run: candidate, role: 'B · Candidate' }),
    ),
    React.createElement('div', { className: 'dcompare-verdict' },
      React.createElement('strong', null, reportHeadline(report.comparison)),
      React.createElement('span', null, pairs ? `${pairs} paired trial(s) · ${pairs === 1 ? 'Single observation, not a stable plugin ranking.' : 'Review repeated-trial statistics below; the cards show the first pair.'}` : 'Recorded session comparison · uncontrolled differences may affect results.'),
    ),
    React.createElement('div', { className: 'dcompare-kpis' }, ...reportMetricCards(report.comparison).map((metric) => React.createElement('div', { className: 'dcompare-kpi', key: metric.label },
      React.createElement('span', null, metric.label),
      React.createElement('strong', null, metric.after),
      React.createElement('small', null, `A ${metric.before} → B ${metric.after}`),
      React.createElement('b', null, `${metric.change} vs A`),
    ))),
    React.createElement('p', { className: 'dcompare-muted' }, 'Tokens include input, output, cache reads and cache writes. Token change is not a cost saving. Tests verify only their covered cases.'),
  )
}

function IdentityCard({ run, role }: { run: ComparisonRun; role: string }): React.ReactElement {
  const identity = runIdentity(run)
  return React.createElement('article', { className: 'dcompare-identity' },
    React.createElement('span', { className: 'dcompare-eyebrow' }, role),
    React.createElement('strong', null, identity.name),
    identity.version ? React.createElement('span', { className: 'dcompare-version' }, `v${identity.version}`) : null,
    React.createElement('span', null, `Preset: ${identity.preset}${identity.presetId ? ` · ${identity.presetId}` : ''}`),
    React.createElement('span', null, `${run.provider ?? 'Provider not recorded'} / ${run.model ?? 'Model not recorded'}`),
    React.createElement('small', null, identity.source),
    React.createElement('div', { className: 'dcompare-check-badge' }, `Execution: ${run.metrics.execution} · Check: ${run.check?.status ?? 'not configured'}`),
  )
}
