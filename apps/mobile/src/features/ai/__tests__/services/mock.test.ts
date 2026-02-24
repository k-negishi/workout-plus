import { MockAIService } from '../../services/mock';
import type { ChatMessage, WorkoutHistoryContext } from '../../types/index';

/**
 * MockAIService のテスト
 * IAIService インターフェースへの準拠と動作を検証する
 */
describe('MockAIService', () => {
  const service = new MockAIService();
  const emptyHistory: ChatMessage[] = [];
  const emptyWorkoutHistory: WorkoutHistoryContext = {
    strategy: 'recent_months',
    data: [],
  };

  it('chat() が IAIService の型に準拠したレスポンスを返すこと', async () => {
    const result = await service.chat({
      message: 'テストメッセージ',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });

    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('振り返り系メッセージで対応したレスポンスが返ること', async () => {
    const result = await service.chat({
      message: '今回のワークアウトを振り返って',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });
    expect(result.content).toBeTruthy();
  });

  it('提案系メッセージで対応したレスポンスが返ること', async () => {
    const result = await service.chat({
      message: '次のメニューを提案して',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });
    expect(result.content).toBeTruthy();
  });

  it('Promise を返すこと（非同期であること）', () => {
    const result = service.chat({
      message: 'test',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });
    expect(result).toBeInstanceOf(Promise);
  });
});
