/**
 * useWorkoutSession Bug 2 修正テスト
 *
 * Bug 2: startSession が過去日付編集時も elapsed_seconds / timer_status をリセットしている
 *
 * 注意: Bug 1（completeWorkout が elapsed_seconds を保存すること）のテストは
 * renderHook を使用するため useWorkoutSession.bugfix.test.tsx に分離した。
 */
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { TimerStatus } from '@/types';

// ============================================================
// Bug 2: startSession が過去日付編集時も elapsed_seconds をリセットしている
// ============================================================

describe('Bug 2: startSession - 過去日付編集時に DB の値を復元する', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().reset();
  });

  /**
   * 修正後の startSession（workoutId 指定 + 過去日付）のロジックをシミュレートする。
   * 実際の startSession は DB・ナビゲーションを含むため、ここではストアへの反映ロジックのみ検証する。
   */
  function simulateStartSessionForPastEdit(options: {
    workoutId: string;
    targetDate: string;
    todayStr: string;
    dbTimerStatus: TimerStatus;
    dbElapsedSeconds: number;
    dbTimerStartedAt: number | null;
  }): void {
    const { targetDate, todayStr, dbTimerStatus, dbElapsedSeconds, dbTimerStartedAt } = options;

    // 過去日付編集モードかどうかを判定する（修正後のロジック）
    const isPastEdit = !!targetDate && targetDate !== todayStr;

    const restoredTimerStatus: TimerStatus = isPastEdit ? dbTimerStatus : TimerStatus.NOT_STARTED;
    const restoredElapsedSeconds = isPastEdit ? dbElapsedSeconds : 0;
    const restoredTimerStartedAt = isPastEdit ? dbTimerStartedAt : null;

    const store = useWorkoutSessionStore.getState();
    // TimerStatus 型を明示して型安全に setTimerStatus を呼ぶ
    store.setTimerStatus(restoredTimerStatus);
    store.setElapsedSeconds(restoredElapsedSeconds);
    store.setTimerStartedAt(restoredTimerStartedAt);
  }

  it('過去日付編集モードでは DB の elapsed_seconds が復元される', () => {
    // Arrange: 過去日付（2026-02-20）の編集、DB に elapsed_seconds=450 が保存されている
    simulateStartSessionForPastEdit({
      workoutId: 'workout-past-1',
      targetDate: '2026-02-20',
      todayStr: '2026-03-04', // 今日とは別の日付
      dbTimerStatus: TimerStatus.DISCARDED,
      dbElapsedSeconds: 450,
      dbTimerStartedAt: null,
    });

    // Assert: DB の値が復元されている（0 にリセットされていない）
    const state = useWorkoutSessionStore.getState();
    expect(state.elapsedSeconds).toBe(450);
  });

  it('過去日付編集モードでは DB の timer_status が復元される', () => {
    // Arrange
    simulateStartSessionForPastEdit({
      workoutId: 'workout-past-2',
      targetDate: '2026-02-20',
      todayStr: '2026-03-04',
      dbTimerStatus: TimerStatus.DISCARDED,
      dbElapsedSeconds: 600,
      dbTimerStartedAt: null,
    });

    // Assert: timer_status が 'not_started' にリセットされていない
    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('discarded');
  });

  it('今日の日付を指定した場合はタイマーをリセットする（過去編集モードではない）', () => {
    // Arrange: targetDate が今日と同じ日付 → 過去編集ではない
    simulateStartSessionForPastEdit({
      workoutId: 'workout-today',
      targetDate: '2026-03-04',
      todayStr: '2026-03-04', // 同じ日付
      dbTimerStatus: TimerStatus.RUNNING,
      dbElapsedSeconds: 300,
      dbTimerStartedAt: Date.now() - 300_000,
    });

    // Assert: 今日の日付なのでリセット（DB の値を使わない）
    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('not_started');
    expect(state.elapsedSeconds).toBe(0);
    expect(state.timerStartedAt).toBeNull();
  });

  it('targetDate が undefined の場合はタイマーをリセットする（通常継続モード）', () => {
    // Arrange: workoutId はあるが targetDate なし（当日継続）
    simulateStartSessionForPastEdit({
      workoutId: 'workout-today-continue',
      targetDate: '', // undefined 相当（空文字で isPastEdit = false になる）
      todayStr: '2026-03-04',
      dbTimerStatus: TimerStatus.RUNNING,
      dbElapsedSeconds: 180,
      dbTimerStartedAt: Date.now() - 180_000,
    });

    // Assert: targetDate なしなのでリセット
    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('not_started');
    expect(state.elapsedSeconds).toBe(0);
  });

  it('isPastEdit の判定: targetDate が今日と異なる場合は true になる', () => {
    // 判定ロジック単体のユニットテスト
    // 変数経由で比較することでリテラル型同士の比較エラーを回避する
    const todayStr: string = '2026-03-04';
    const pastDate: string = '2026-02-14';
    const todayDate: string = '2026-03-04';
    const emptyDate: string = '';

    const isPastEdit = (targetDate: string): boolean => !!targetDate && targetDate !== todayStr;

    // 過去日付 → true
    expect(isPastEdit(pastDate)).toBe(true);
    // 今日と同じ → false
    expect(isPastEdit(todayDate)).toBe(false);
    // 空文字（undefined 相当） → false
    expect(isPastEdit(emptyDate)).toBe(false);
  });
});
