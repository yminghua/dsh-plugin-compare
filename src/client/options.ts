import type { Context } from '@deepseek-ai/cordis'
import type { ListModelsResult, ListPresetsResult, ListSessionsResult } from '../shared/protocol.ts'
import type {} from '../shared/cordis.ts'

export async function rpc<T>(ctx: Context, endpoint: string, payload: unknown): Promise<T> {
  const response = await ctx.connection.rpc.call('/dsh-plugin-compare', endpoint, payload)
  if (!response.ok) throw new Error(response.error.message ?? 'DSH Plugin Compare request failed')
  return response.value as T
}

export async function loadProofOptions(ctx: Context) {
  const [sessions, presets, models] = await Promise.allSettled([
    rpc<ListSessionsResult>(ctx, 'list', { limit: 100 }),
    rpc<ListPresetsResult>(ctx, 'presets', {}),
    rpc<ListModelsResult>(ctx, 'models', {}),
  ])
  const errors = [sessions, presets, models].flatMap((result, index) => result.status === 'rejected'
    ? [`${['Sessions', 'Presets', 'Models'][index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : [])
  return { sessions, presets, models, errors }
}
