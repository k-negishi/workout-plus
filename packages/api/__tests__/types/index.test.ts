import { describe, expect,it } from 'vitest';

import type {
  APIError,
  ChatRequest,
  ChatResponse,
  ConversationMessage,
  WorkoutHistoryContext,
} from '../../src/types/index.js';

describe('共通型定義', () => {
  it('ChatRequest の shape が正しいこと', () => {
    // コンパイルチェック: satisfies で型の整合性を確認
    const req = {
      message: 'テストメッセージ',
      workoutHistory: {
        strategy: 'recent_months' as const,
        data: [],
      },
      conversationHistory: [],
    } satisfies ChatRequest;

    expect(req.message).toBe('テストメッセージ');
    expect(req.workoutHistory.strategy).toBe('recent_months');
  });

  it('ChatResponse の shape が正しいこと', () => {
    const res = {
      message: 'AIの返答',
    } satisfies ChatResponse;

    expect(res.message).toBe('AIの返答');
  });

  it('WorkoutHistoryContext の各戦略が受け入れられること', () => {
    const ctx1: WorkoutHistoryContext = { strategy: 'recent_months', data: [] };
    const ctx2: WorkoutHistoryContext = { strategy: 'exercise_specific', data: [] };
    const ctx3: WorkoutHistoryContext = { strategy: 'date_range', data: [] };

    expect(ctx1.strategy).toBe('recent_months');
    expect(ctx2.strategy).toBe('exercise_specific');
    expect(ctx3.strategy).toBe('date_range');
  });

  it('ConversationMessage の role が user/assistant のみ許容されること', () => {
    const userMsg: ConversationMessage = { role: 'user', content: 'hello' };
    const assistantMsg: ConversationMessage = { role: 'assistant', content: 'world' };

    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
  });

  it('APIError の code が ErrorCode 型に準拠すること', () => {
    const err: APIError = { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    expect(err.code).toBe('UNAUTHORIZED');
  });
});
