import { describe, expect,it } from 'vitest';

import type { WorkoutHistoryContext } from '../../../src/schemas.js';
import { RecentMonthsStrategy } from '../../../src/strategies/workoutHistory/recentMonths.js';

describe('RecentMonthsStrategy', () => {
  const strategy = new RecentMonthsStrategy();

  it('data が空のとき空文字を返すこと', () => {
    const ctx: WorkoutHistoryContext = { strategy: 'recent_months', data: [] };
    expect(strategy.buildPromptText(ctx)).toBe('');
  });

  it('1件の履歴を正しく整形すること', () => {
    const ctx: WorkoutHistoryContext = {
      strategy: 'recent_months',
      data: [{
        date: '2026-02-20',
        exercises: [{
          name: 'ベンチプレス',
          muscleGroup: 'chest',
          sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 6 }],
        }],
        memo: 'グッドセッション',
      }],
    };
    const text = strategy.buildPromptText(ctx);
    expect(text).toContain('2026-02-20');
    expect(text).toContain('ベンチプレス');
    expect(text).toContain('80kg');
    expect(text).toContain('8回');
    expect(text).toContain('グッドセッション');
  });

  it('weight/reps が null のセットを適切に扱うこと', () => {
    const ctx: WorkoutHistoryContext = {
      strategy: 'recent_months',
      data: [{
        date: '2026-02-21',
        exercises: [{ name: 'プランク', muscleGroup: 'core', sets: [{ weight: null, reps: null }] }],
        memo: null,
      }],
    };
    const text = strategy.buildPromptText(ctx);
    expect(text).toContain('プランク');
    expect(typeof text).toBe('string');
  });

  it('複数ワークアウトが日付昇順で並ぶこと', () => {
    const ctx: WorkoutHistoryContext = {
      strategy: 'recent_months',
      data: [
        { date: '2026-02-22', exercises: [], memo: null },
        { date: '2026-02-20', exercises: [], memo: null },
        { date: '2026-02-21', exercises: [], memo: null },
      ],
    };
    const text = strategy.buildPromptText(ctx);
    const i20 = text.indexOf('2026-02-20');
    const i21 = text.indexOf('2026-02-21');
    const i22 = text.indexOf('2026-02-22');
    expect(i20).toBeLessThan(i21);
    expect(i21).toBeLessThan(i22);
  });
});
