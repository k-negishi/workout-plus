import type { ConversationMessage } from '../../schemas.js';
import type { IConversationHistoryRepository } from './interface.js';

/**
 * インメモリ会話履歴リポジトリ
 *
 * Lambda インスタンス内でのみ有効（コールドスタートでリセット）。
 * 現在は mobile 側がセッション管理するため未使用だが、
 * Lambda 側での永続化が必要になった際に DynamoDB 実装に差し替える。
 */
export class InMemoryConversationHistoryRepository implements IConversationHistoryRepository {
  private readonly store = new Map<string, ConversationMessage[]>();

  async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    return this.store.get(sessionId) ?? [];
  }

  async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const history = this.store.get(sessionId) ?? [];
    history.push(message);
    this.store.set(sessionId, history);
  }

  async clearHistory(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}
