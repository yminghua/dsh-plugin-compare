import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import './types.ts'
import { injectStyles } from './styles.ts'
import { requestProofPanel, subscribeProofPanel } from './ui-state.ts'

export const inject = ['slots']

export function apply(ctx: Context): void {
  injectStyles()
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'dsh-proof', order: 40 },
    ProofAction,
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dsh-proof', order: 40 },
    ProofPanel,
  ))
}

function ProofAction(): React.ReactElement {
  return React.createElement('button', {
    type: 'button',
    className: 'dproof-button',
    onClick: requestProofPanel,
  }, 'Proof')
}

function ProofPanel(): React.ReactElement | null {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => subscribeProofPanel(() => setOpen(true)), [])
  if (!open) return null
  return React.createElement('section', { className: 'dproof-panel', 'aria-label': 'DSH Proof comparison' },
    React.createElement('header', { className: 'dproof-head' },
      React.createElement('span', { className: 'dproof-title' }, 'DSH Proof'),
      React.createElement('button', { type: 'button', className: 'dproof-close', onClick: () => setOpen(false), 'aria-label': 'Close' }, '×'),
    ),
    React.createElement('div', { className: 'dproof-body' },
      React.createElement('div', { className: 'dproof-columns' },
        React.createElement('div', { className: 'dproof-run' }, React.createElement('strong', null, 'Baseline'), React.createElement('span', null, 'Select a session')),
        React.createElement('div', { className: 'dproof-run' }, React.createElement('strong', null, 'Candidate'), React.createElement('span', null, 'Select a session')),
      ),
      React.createElement('div', { className: 'dproof-empty' }, 'Workspace ready. Session projection and comparison controls land in the next milestone.'),
    ),
  )
}
