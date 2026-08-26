import { compareRuns, comparisonEvidence, projectSession, projectSessionEvidence, type ProofEvent, type ProofRun, type RunEvidence } from '../core/index.ts'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { CompareSessionsResult, ListSessionsResult, ReadSessionResult, RpcResult, SessionListItem } from '../shared/protocol.ts'
import type { HostContext, SessionQueryLike, SessionRecord, TitleSnapshotResult } from './services.ts'

interface ApiConfig { maxRuns: number }

function titleOf(result: TitleSnapshotResult): string | undefined {
  return result.status === 'fulfilled' ? result.value?.title?.title : undefined
}

async function titleMap(query: SessionQueryLike, ids: readonly SessionId[], signal?: AbortSignal): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const snapshots = await query.readTitleSnapshots(ids, signal)
  const entries: Array<[string, string]> = []
  for (const snapshot of snapshots) {
    const title = titleOf(snapshot)
    if (title !== undefined) entries.push([snapshot.sessionId, title])
  }
  return new Map(entries)
}

function sessionItem(record: SessionRecord, titles: Map<string, string>): SessionListItem {
  return {
    sessionId: record.header.id,
    title: titles.get(record.header.id) ?? '(untitled)',
    cwd: record.header.cwd ?? '',
    createdAt: new Date(record.header.createdAt).toISOString(),
    live: record.live,
    persisted: record.persisted,
  }
}

interface ReadProjection { run: ProofRun; evidence: RunEvidence }

async function readProjection(query: SessionQueryLike, sessionId: string, signal?: AbortSignal): Promise<ReadProjection> {
  const records = await query.listSessions(signal)
  const record = records.find((item) => item.header.id === sessionId)
  if (record === undefined) throw new Error(`Session not found: ${sessionId}`)
  const id = sessionId as SessionId
  const [read, titles] = await Promise.all([query.readSession(id), titleMap(query, [id], signal)])
  const input = {
    id: sessionId,
    title: titles.get(sessionId) ?? '(untitled)',
    createdAt: record.header.createdAt,
    ...(record.header.cwd !== undefined ? { cwd: record.header.cwd } : {}),
    events: read.events as readonly ProofEvent[],
  }
  return { run: projectSession(input), evidence: projectSessionEvidence(sessionId, input.events) }
}

function sessionIdFrom(value: unknown, field: string): string {
  if (!value || typeof value !== 'object') throw new Error(`Missing ${field}`)
  const id = (value as Record<string, unknown>)[field]
  if (typeof id !== 'string' || id.trim() === '') throw new Error(`Missing ${field}`)
  return id
}

function errorResult(error: unknown): RpcResult<never> {
  return { ok: false, error: { code: 'dsh_proof_error', message: error instanceof Error ? error.message : String(error) } }
}

export function registerProofApi(ctx: HostContext, config: ApiConfig): void {
  ctx.effect(() => ctx.connection.rpc.handle('/dsh-proof', async (endpoint, payload, signal) => {
    try {
      if (endpoint === 'list') {
        const requested = payload && typeof payload === 'object' ? Number((payload as Record<string, unknown>).limit) : config.maxRuns
        const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), config.maxRuns) : config.maxRuns
        const records = await ctx.sessionQuery.listSessions(signal)
        const selected = records.slice(0, limit)
        const titles = await titleMap(ctx.sessionQuery, selected.map((record) => record.header.id), signal)
        const value: ListSessionsResult = { sessions: selected.map((record) => sessionItem(record, titles)), total: records.length }
        return { ok: true, value }
      }
      if (endpoint === 'read') {
        const value: ReadSessionResult = { run: (await readProjection(ctx.sessionQuery, sessionIdFrom(payload, 'sessionId'), signal)).run }
        return { ok: true, value }
      }
      if (endpoint === 'compare') {
        const baselineId = sessionIdFrom(payload, 'baselineId')
        const candidateId = sessionIdFrom(payload, 'candidateId')
        if (baselineId === candidateId) throw new Error('Choose two different sessions')
        const [baseline, candidate] = await Promise.all([
          readProjection(ctx.sessionQuery, baselineId, signal),
          readProjection(ctx.sessionQuery, candidateId, signal),
        ])
        const value: CompareSessionsResult = {
          comparison: compareRuns(baseline.run, candidate.run),
          evidence: comparisonEvidence(baseline.evidence, candidate.evidence),
        }
        return { ok: true, value }
      }
      return errorResult(new Error(`Unknown endpoint: ${endpoint}`))
    } catch (error) {
      return errorResult(error)
    }
  }, { authority: 'trusted-host' }), 'dsh-proof: RPC API')
}
