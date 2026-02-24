/**
 * 型定義の re-export
 * 型の実体は src/schemas.ts（Zod スキーマから infer）で定義している。
 * 後方互換のためこのファイルから import できるように保持する。
 */
export type {
  ChatRequest,
  ChatResponse,
  WorkoutHistoryContext,
  WorkoutSummary,
  ConversationMessage,
  APIError,
  ErrorCode,
} from '../schemas.js';
