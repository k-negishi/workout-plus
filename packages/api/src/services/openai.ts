import OpenAI from 'openai';
import type { ConversationMessage } from '../schemas.js';
import { createAPIError } from '../middleware/errorHandler.js';
import type { IAIProvider } from './provider.js';

/**
 * OpenAI モデル ID（デフォルト: gpt-4o-mini）
 * OPENAI_MODEL_ID 環境変数で上書き可能
 *
 * gpt-4o-mini を選ぶ理由: 推論ステップがなく低レイテンシ。パーソナルトレーナー用途には十分。
 * gpt-5-mini は推論モデルのため応答が遅い（reasoning tokens 消費）。
 *
 * TODO: ストリーミング対応時は client.chat.completions.stream() に変更する
 */
const MODEL_ID = process.env['OPENAI_MODEL_ID'] ?? 'gpt-4o-mini';

/**
 * OpenAI クライアント（Lambda 実行環境用シングルトン）
 * OPENAI_API_KEY 環境変数から API キーを取得する
 */
// テスト環境では OPENAI_API_KEY が未設定のためフォールバックを設定する
// 実際の API 呼び出しはテスト内でモック化するため値は使われない
export const openaiClient = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'] ?? 'not-set',
});

/**
 * パーソナルトレーナー向けシステムプロンプトを構築する
 *
 * TODO: userProfile（目標・自由記述）対応時は引数を追加して末尾に付与する
 *   例: buildSystemPrompt(historyText, userProfile?: { goals: string; freeText: string })
 */
export function buildSystemPrompt(historyText: string): string {
  const base = `あなたはパーソナルトレーナーの AI アシスタントです。
ユーザーのトレーニングに関する質問に日本語で親切・簡潔に回答してください。
メニュー提案、フォームアドバイス、栄養指導など幅広くサポートします。`;

  if (!historyText) return base;

  return `${base}\n\n${historyText}\n\n上記の履歴を参考に、ユーザーに合ったアドバイスをしてください。`;
}

/**
 * OpenAI GPT を呼び出して返答テキストを取得する（非ストリーミング）
 *
 * @param client テスト時に差し替え可能な OpenAI クライアント
 *
 * TODO: ストリーミング対応
 *   1. client.chat.completions.stream() を使用
 *   2. AsyncIterable<ChatCompletionChunk> をチャンクごとに処理
 *   3. routes/ai/chat.ts で SSE（text/event-stream）レスポンスに変換
 *   4. mobile 側で fetch ReadableStream または EventSource で受信
 */
export async function invokeModel(
  client: OpenAI,
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string,
): Promise<{ text: string }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 推論モデル（gpt-5-mini, o1, o3 等）は max_completion_tokens を使用する
  // 非推論モデル（gpt-4o-mini 等）は max_tokens を使用する
  const isReasoningModel = MODEL_ID.startsWith('o') || MODEL_ID.includes('gpt-5');
  const tokenParam = isReasoningModel
    ? { max_completion_tokens: 4096 }
    : { max_tokens: 1024 };

  try {
    const response = await client.chat.completions.create({
      model: MODEL_ID,
      ...tokenParam,
      messages,
    });

    const text = response.choices[0]?.message?.content ?? '';
    return { text };
  } catch (error) {
    // TODO: エラーコードを BEDROCK_ERROR → AI_ERROR にリネームする（schemas.ts・openapi.json・api.d.ts の再生成が必要）
    throw createAPIError(
      'BEDROCK_ERROR',
      `AI サービスの呼び出しに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    );
  }
}

/**
 * IAIProvider の OpenAI 実装
 *
 * createAIProvider() から生成される。直接インスタンス化する代わりに
 * createAIProvider() を使うことでプロバイダーの切り替えが容易になる。
 */
export class OpenAIProvider implements IAIProvider {
  async invoke(
    systemPrompt: string,
    conversationHistory: ConversationMessage[],
    userMessage: string,
  ): Promise<{ text: string }> {
    return invokeModel(openaiClient, systemPrompt, conversationHistory, userMessage);
  }
}
