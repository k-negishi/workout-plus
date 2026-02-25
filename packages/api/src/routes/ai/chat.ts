import { createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';

import type { WorkoutHistoryContext } from '../../schemas.js';
import { APIErrorSchema, ChatRequestSchema, ChatResponseSchema } from '../../schemas.js';
import { buildSystemPrompt } from '../../services/openai.js';
import { createAIProvider } from '../../services/provider.js';
import type { WorkoutHistoryStrategy } from '../../strategies/workoutHistory/interface.js';
import { RecentMonthsStrategy } from '../../strategies/workoutHistory/recentMonths.js';

// モジュールロード時にプロバイダーを一度だけ生成する（Lambda コールドスタート最適化）
const aiProvider = createAIProvider();

/**
 * WorkoutHistoryStrategy をコンテキストの strategy フィールドで選択する
 *
 * TODO: 新しい戦略を追加する場合は以下の手順で対応:
 *   1. src/strategies/workoutHistory/ に新しいクラスを作成
 *   2. ここの switch 文に case を追加
 *   3. schemas.ts の WorkoutHistoryContextSchema の strategy enum に値を追加
 */
function getStrategy(strategy: WorkoutHistoryContext['strategy']): WorkoutHistoryStrategy {
  switch (strategy) {
    case 'recent_months':
      return new RecentMonthsStrategy();
    // TODO: case 'exercise_specific': return new ExerciseSpecificStrategy();
    // TODO: case 'date_range': return new DateRangeStrategy();
    default:
      return new RecentMonthsStrategy();
  }
}

/** POST /ai/chat のルート定義 */
export const chatRoute = createRoute({
  method: 'post',
  path: '/chat',
  tags: ['AI'],
  summary: 'AI チャット',
  description: 'トレーニング履歴を含めて GPT-5 mini に問い合わせる',
  request: {
    headers: z.object({
      'x-api-key': z.string().openapi({ description: 'X-API-Key 認証キー' }),
    }),
    body: {
      content: { 'application/json': { schema: ChatRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ChatResponseSchema } },
      description: 'AI からの返答',
    },
    400: {
      content: { 'application/json': { schema: APIErrorSchema } },
      description: 'バリデーションエラー',
    },
    401: {
      content: { 'application/json': { schema: APIErrorSchema } },
      description: '認証エラー',
    },
    502: {
      content: { 'application/json': { schema: APIErrorSchema } },
      description: 'Bedrock エラー',
    },
  },
});

/** POST /ai/chat ハンドラー */
export async function handleAIChat(
  body: typeof ChatRequestSchema._type,
): Promise<{ message: string }> {
  const historyStrategy = getStrategy(body.workoutHistory.strategy);
  const historyText = historyStrategy.buildPromptText(body.workoutHistory);
  const systemPrompt = buildSystemPrompt(historyText);
  const { text } = await aiProvider.invoke(systemPrompt, body.conversationHistory, body.message);
  return { message: text };
}
