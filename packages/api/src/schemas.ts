/**
 * API の Zod スキーマ定義（Single Source of Truth）
 *
 * @hono/zod-openapi の z を使用することで、
 * バリデーション・型推論・OpenAPI スペック生成を一元管理する。
 *
 * 型の使用方法:
 *   import type { ChatRequest } from './schemas.js'
 *   → z.infer<typeof ChatRequestSchema> のエイリアスとして使用可能
 */
import { z } from '@hono/zod-openapi';

// ─── ワークアウト履歴 ───────────────────────────────────────────

export const WorkoutSetSchema = z
  .object({
    weight: z.number().nullable().openapi({ example: 80, description: '重量（kg）。null は未記録' }),
    reps: z.number().int().nullable().openapi({ example: 8, description: 'レップ数。null は未記録' }),
  })
  .openapi('WorkoutSet');

export const WorkoutExerciseSchema = z
  .object({
    name: z.string().openapi({ example: 'ベンチプレス' }),
    muscleGroup: z.string().openapi({ example: 'chest' }),
    sets: z.array(WorkoutSetSchema),
  })
  .openapi('WorkoutExercise');

export const WorkoutSummarySchema = z
  .object({
    date: z.string().openapi({ example: '2026-02-20', description: 'yyyy-MM-dd 形式' }),
    exercises: z.array(WorkoutExerciseSchema),
    memo: z.string().nullable().openapi({ example: 'グッドセッション' }),
  })
  .openapi('WorkoutSummary');

/**
 * ワークアウト履歴コンテキスト
 *
 * mobile 側で構築してリクエストに含めて送る。
 * strategy フィールドで Lambda 側がどの WorkoutHistoryStrategy を使うか判断する。
 *
 * TODO: 現在は 'recent_months' のみ実装。
 *       'exercise_specific': 特定種目の過去1年分を渡す（ExerciseSpecificStrategy）
 *       'date_range': 任意期間のデータを渡す（DateRangeStrategy）
 *       → 追加時は WorkoutHistoryStrategyRegistry に strategy を登録する
 */
export const WorkoutHistoryContextSchema = z
  .object({
    strategy: z
      .enum(['recent_months', 'exercise_specific', 'date_range'])
      .openapi({ example: 'recent_months' }),
    data: z.array(WorkoutSummarySchema),
  })
  .openapi('WorkoutHistoryContext');

// ─── 会話履歴 ─────────────────────────────────────────────────

export const ConversationMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']).openapi({ example: 'user' }),
    content: z.string().openapi({ example: 'こんにちは' }),
  })
  .openapi('ConversationMessage');

// ─── チャット API ──────────────────────────────────────────────

/**
 * POST /ai/chat リクエストスキーマ
 *
 * TODO: 将来の拡張予定フィールド:
 *   userProfile?: { goals: string; freeText: string }
 *     → カスタムデフォルトプロンプト（目標欄・自由入力欄）
 *     → システムプロンプトの末尾に付与する
 *   sessionId?: string
 *     → DynamoDB での会話履歴永続化対応時に使用
 *     → IConversationHistoryRepository に渡す
 */
export const ChatRequestSchema = z
  .object({
    message: z
      .string()
      .min(1, 'メッセージは1文字以上必要です')
      .max(1000, 'メッセージは1000文字以内にしてください')
      .openapi({ example: '今回のワークアウトを振り返って' }),
    workoutHistory: WorkoutHistoryContextSchema,
    conversationHistory: z.array(ConversationMessageSchema).openapi({
      description: 'セッション内の会話履歴（最新N件）',
    }),
  })
  .openapi('ChatRequest');

/**
 * POST /ai/chat レスポンススキーマ
 *
 * TODO: 将来の拡張予定フィールド:
 *   streamUrl?: string
 *     → ストリーミング対応時: SSE エンドポイント URL を返す設計
 *     → InvokeModelWithResponseStream を使用する
 *     → mobile 側は EventSource または fetch ReadableStream で受信
 */
export const ChatResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'お疲れ様でした！今回のトレーニングは...' }),
  })
  .openapi('ChatResponse');

// ─── エラー ────────────────────────────────────────────────────

/**
 * API エラーコード
 *
 * TODO: 将来追加予定:
 *   'COGNITO_AUTH_ERROR': Cognito JWT 検証失敗（#11 対応後）
 *   'STREAM_ERROR': ストリーミング中のエラー
 */
export const ErrorCodeSchema = z
  .enum(['UNAUTHORIZED', 'BEDROCK_ERROR', 'VALIDATION_ERROR', 'INTERNAL_ERROR'])
  .openapi('ErrorCode');

export const APIErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Unauthorized: Invalid or missing API key' }),
    code: ErrorCodeSchema,
  })
  .openapi('APIError');

// ─── 型エクスポート（z.infer のエイリアス）───────────────────

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type WorkoutHistoryContext = z.infer<typeof WorkoutHistoryContextSchema>;
export type WorkoutSummary = z.infer<typeof WorkoutSummarySchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
