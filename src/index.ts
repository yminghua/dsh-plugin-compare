import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { ProofCollector, type CapturedEvent } from './core/index.ts'

export const name = 'dsh-proof'
export const inject: string[] = []

export interface Config {
  redactSecrets?: boolean
  captureToolContent?: boolean
  maxRuns?: number
}

export function apply(ctx: Context, _config: Config): void {
  const collector = new ProofCollector()
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    collector.record(String(session.id), event as CapturedEvent)
  })
}

export * from './core/index.ts'
