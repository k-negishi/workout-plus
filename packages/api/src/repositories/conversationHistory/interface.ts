import type { ConversationMessage } from '../../schemas.js';

/**
 * 会話履歴リポジトリのインターフェース
 *
 * TODO: DynamoDB 実装（DynamoDBConversationHistoryRepository）
 *   実装時の考慮事項:
 *     - パーティションキー: userId（Cognito sub）
 *     - ソートキー: sessionId + timestamp
 *     - TTL: 30日で自動削除
 *     - GSI: userId で全セッション一覧取得
 *   依存: #10（DynamoDB テーブル設計）、#11（Cognito userId 取得）
 *
 * 切り替え方法:
 *   src/app.ts の conversationHistoryRepo を
 *   InMemoryConversationHistoryRepository から
 *   DynamoDBConversationHistoryRepository に差し替えるだけでよい
 */
export interface IConversationHistoryRepository {
  getHistory(sessionId: string): Promise<ConversationMessage[]>;
  saveMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  clearHistory(sessionId: string): Promise<void>;
}
