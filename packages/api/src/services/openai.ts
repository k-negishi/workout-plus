import OpenAI from 'openai';
import type { ConversationMessage } from '../schemas.js';
import { createAPIError } from '../middleware/errorHandler.js';

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

  try {
    const response = await client.chat.completions.create({
      model: MODEL_ID,
      // gpt-4o-mini 等の非推論モデルは max_tokens を使用する
      // 推論モデル（gpt-5-mini 等）は max_completion_tokens が必要だが、現在は非推論モデルを使用
      max_tokens: 1024,
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
