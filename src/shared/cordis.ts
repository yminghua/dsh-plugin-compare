import type {} from '@deepseek-ai/cordis'
import type { RpcResult } from './protocol.ts'

export interface ConnectionRpcLike {
  handle(
    channel: string,
    handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult<unknown>>,
    options: { authority: 'trusted-host' | 'loopback' },
  ): () => Promise<void>
  call(channel: string, endpoint: string, payload: unknown): Promise<RpcResult<unknown>>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    connection: { rpc: ConnectionRpcLike }
  }
}
