import type {
  ChatMessage,
  IAIService,
  QuickAction,
} from '../../types/index';
import { DEFAULT_QUICK_ACTIONS } from '../../types/index';

/**
 * AI 機能の型定義テスト
 * コンパイルチェックと定数値の検証
 */
describe('AI 型定義', () => {
  it('ChatMessage の shape が正しいこと', () => {
    const msg: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'テスト',
      createdAt: Date.now(),
    };
    expect(msg.role).toBe('user');
  });

  it('DEFAULT_QUICK_ACTIONS が 3 件であること', () => {
    expect(DEFAULT_QUICK_ACTIONS).toHaveLength(3);
  });

  it('DEFAULT_QUICK_ACTIONS の各要素が QuickAction 型に準拠すること', () => {
    DEFAULT_QUICK_ACTIONS.forEach((action: QuickAction) => {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('label');
      expect(action).toHaveProperty('prompt');
      expect(typeof action.id).toBe('string');
      expect(typeof action.label).toBe('string');
      expect(typeof action.prompt).toBe('string');
    });
  });

  it('DEFAULT_QUICK_ACTIONS の id が review, next, goal であること', () => {
    const ids = DEFAULT_QUICK_ACTIONS.map((a) => a.id);
    expect(ids).toContain('review');
    expect(ids).toContain('next');
    expect(ids).toContain('goal');
  });
});

// IAIService 型を参照して TypeScript のコンパイルチェックを行う（実行時には不要）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IAIServiceCheck = IAIService;
