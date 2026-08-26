import type { Context } from '@deepseek-ai/cordis'
import type {
  SessionQueryEngine,
  SessionRecord,
  SessionTitleObservationResult,
} from '@deepseek-ai/dsh-session-query'

export type SessionQueryLike = Pick<
  SessionQueryEngine,
  'listSessions' | 'readSession' | 'readTitleSnapshots'
>

export type TitleSnapshotResult = SessionTitleObservationResult
export type { SessionRecord }
export type HostContext = Context
