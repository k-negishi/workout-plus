import type { ConversationMessage } from '../schemas.js';
import { OpenAIProvider } from './openai.js';

/**
 * AI プロバイダーの共通インターフェース
 *
 * OpenAI・Bedrock など複数のバックエンドを透過的に切り替えるための抽象。
 * 新しいプロバイダーを追加する場合:
 *   1. src/services/<name>.ts に IAIProvider を実装するクラスを作成
 *   2. createAIProvider() の switch 文に case を追加
 *   3. .env に AI_PROVIDER=<name> を設定
 */
export interface IAIProvider {
  invoke(
    systemPrompt: string,
    conversationHistory: ConversationMessage[],
    userMessage: string,
  ): Promise<{ text: string }>;
}

/**
 * 環境変数 AI_PROVIDER に基づいて AI プロバイダーを生成する
 *
 * AI_PROVIDER=openai   → OpenAIProvider（デフォルト）
 * AI_PROVIDER=bedrock  → BedrockProvider（TODO: 実装後に有効化）
 */
export function createAIProvider(): IAIProvider {
  const providerName = process.env['AI_PROVIDER'] ?? 'openai';

  switch (providerName) {
    case 'openai':
      return new OpenAIProvider();
    // TODO: Bedrock に切り替える場合は以下を有効化する
    // case 'bedrock':
    //   return new BedrockProvider();
    default:
      throw new Error(`未知の AI_PROVIDER です: ${providerName}。openai を指定してください。`);
  }
}
