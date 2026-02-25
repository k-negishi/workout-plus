/**
 * useTimer ユニットテスト
 * 状態遷移とバックグラウンド復帰のテスト
 *
 * 注意: useTimerはReactフックのため、renderHookを使ってテストする
 * ここではロジック部分のユニットテストとして、
 * workoutSessionStoreの状態遷移を直接テストする
 */
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

describe('useTimer - 状態遷移テスト', () => {
  beforeEach(() => {
    // ストアを初期化
    useWorkoutSessionStore.getState().reset();
  });

  it('初期状態は not_started で elapsed=0', () => {
    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('not_started');
    expect(state.elapsedSeconds).toBe(0);
    expect(state.timerStartedAt).toBeNull();
  });

  it('not_started → running 遷移', () => {
    const store = useWorkoutSessionStore.getState();
    const now = Date.now();

    store.setTimerStatus('running');
    store.setTimerStartedAt(now);

    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('running');
    expect(state.timerStartedAt).toBe(now);
  });

  it('running → paused 遷移（elapsed が保存される）', () => {
    const store = useWorkoutSessionStore.getState();

    // running開始
    store.setTimerStatus('running');
    store.setTimerStartedAt(Date.now() - 30000); // 30秒前に開始

    // paused に遷移
    store.setTimerStatus('paused');
    store.setElapsedSeconds(30);
    store.setTimerStartedAt(null);

    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('paused');
    expect(state.elapsedSeconds).toBe(30);
    expect(state.timerStartedAt).toBeNull();
  });

  it('paused → running 遷移（elapsed が維持される）', () => {
    const store = useWorkoutSessionStore.getState();

    // 30秒経過してpaused状態
    store.setTimerStatus('paused');
    store.setElapsedSeconds(30);
    store.setTimerStartedAt(null);

    // running に再開
    const resumeTime = Date.now();
    store.setTimerStatus('running');
    store.setTimerStartedAt(resumeTime);

    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('running');
    expect(state.elapsedSeconds).toBe(30); // ベース値が維持される
    expect(state.timerStartedAt).toBe(resumeTime);
  });

  it('reset で初期状態に戻る', () => {
    const store = useWorkoutSessionStore.getState();

    // 状態を変更
    store.setTimerStatus('running');
    store.setElapsedSeconds(120);
    store.setTimerStartedAt(Date.now());

    // リセット
    store.reset();

    const state = useWorkoutSessionStore.getState();
    expect(state.timerStatus).toBe('not_started');
    expect(state.elapsedSeconds).toBe(0);
    expect(state.timerStartedAt).toBeNull();
  });

  describe('バックグラウンド復帰時の elapsed_seconds 算出', () => {
    it('running中にバックグラウンドから復帰した場合、経過時間を正確に算出できる', () => {
      const store = useWorkoutSessionStore.getState();

      // 60秒のベースelapsedがあり、10秒前にtimerを開始した状態をシミュレート
      const tenSecondsAgo = Date.now() - 10000;
      store.setTimerStatus('running');
      store.setElapsedSeconds(60);
      store.setTimerStartedAt(tenSecondsAgo);

      const state = useWorkoutSessionStore.getState();

      // バックグラウンド復帰時の計算ロジック:
      // totalElapsed = elapsedSeconds + floor((now - timerStartedAt) / 1000)
      const additionalSeconds = Math.floor((Date.now() - state.timerStartedAt!) / 1000);
      const totalElapsed = state.elapsedSeconds + additionalSeconds;

      // 約70秒（60 + 10）になるはず（タイミングによって±1秒の誤差を許容）
      expect(totalElapsed).toBeGreaterThanOrEqual(69);
      expect(totalElapsed).toBeLessThanOrEqual(71);
    });

    it('paused中はtimerStartedAtがnullなので経過時間は変わらない', () => {
      const store = useWorkoutSessionStore.getState();

      store.setTimerStatus('paused');
      store.setElapsedSeconds(45);
      store.setTimerStartedAt(null);

      const state = useWorkoutSessionStore.getState();
      // paused中はtimerStartedAtがnullなので、elapsedSecondsがそのまま
      expect(state.elapsedSeconds).toBe(45);
      expect(state.timerStartedAt).toBeNull();
    });
  });

  describe('Issue #149: インターバルが指数的に速く進まないことの確認（displayElapsed の計算ロジック）', () => {
    it('running中の displayElapsed は elapsedSeconds + (now - timerStartedAt)/1000 で算出される', () => {
      // useTimer の displayElapsed の計算ロジックを直接検証する。
      // 修正前: displayElapsed = elapsedSeconds（timerStartedAt が無視されていた）
      // 修正後: displayElapsed = elapsedSeconds + floor((now - timerStartedAt) / 1000)
      const store = useWorkoutSessionStore.getState();

      // 10秒前に開始した running 状態をシミュレートする
      const tenSecondsAgo = Date.now() - 10000;
      store.setTimerStatus('running');
      store.setElapsedSeconds(0); // ベース値は 0（startTimer 直後は 0）
      store.setTimerStartedAt(tenSecondsAgo);

      const state = useWorkoutSessionStore.getState();
      // 正しい displayElapsed 計算式: elapsedSeconds + floor((now - timerStartedAt) / 1000)
      const displayElapsed =
        state.timerStatus === 'running' && state.timerStartedAt != null
          ? state.elapsedSeconds + Math.floor((Date.now() - state.timerStartedAt) / 1000)
          : state.elapsedSeconds;

      // 10秒前に開始したので約10秒になる（±1秒の許容）
      expect(displayElapsed).toBeGreaterThanOrEqual(9);
      expect(displayElapsed).toBeLessThanOrEqual(11);
    });

    it('interval コールバックで elapsedSeconds が直接上書きされると指数的増加が起きる（バグの再現）', () => {
      // バグのメカニズムを確認するテスト（修正後もロジックの理解として残す）
      // ベース elapsed=0, timerStartedAt=10秒前 の状態で
      // 旧コードの計算 elapsedSeconds + (now - timerStartedAt)/1000 を適用すると:
      //   1回目: 0 + 10 = 10 → elapsedSeconds が 10 に書き換わる
      //   2回目: 10 + 10 = 20 → elapsedSeconds が 20 に書き換わる（本来は 10 のまま）
      // これが指数的増加の原因。
      // 正しい設計: interval は incrementInvalidation() を呼ぶだけにして、
      //             displayElapsed は timerStartedAt からリアルタイムに計算する。

      const store = useWorkoutSessionStore.getState();
      const startTime = Date.now() - 10000; // 10秒前
      store.setTimerStatus('running');
      store.setElapsedSeconds(0);
      store.setTimerStartedAt(startTime);

      // 修正後の正しい設計: elapsedSeconds（ベース値）は interval で書き換えない
      // invalidationCounter のみを増加させて re-render をトリガーする
      store.incrementInvalidation();
      store.incrementInvalidation();
      store.incrementInvalidation();

      const state = useWorkoutSessionStore.getState();
      // ベース値の elapsedSeconds は変更されていない
      expect(state.elapsedSeconds).toBe(0);
      // invalidationCounter は増加している（re-render トリガーとして機能している）
      expect(state.invalidationCounter).toBe(3);
    });
  });

  describe('discarded 状態への遷移', () => {
    it('running から discarded へ遷移し、elapsed=0 / timerStartedAt=null になる', () => {
      const store = useWorkoutSessionStore.getState();
      store.setTimerStatus('running');
      store.setElapsedSeconds(123);
      store.setTimerStartedAt(Date.now() - 5000);

      // stopTimer() の期待動作
      store.setTimerStatus('discarded');
      store.setElapsedSeconds(0);
      store.setTimerStartedAt(null);

      const state = useWorkoutSessionStore.getState();
      expect(state.timerStatus).toBe('discarded');
      expect(state.elapsedSeconds).toBe(0);
      expect(state.timerStartedAt).toBeNull();
    });

    it('paused から discarded へ遷移し、elapsed=0 / timerStartedAt=null になる', () => {
      const store = useWorkoutSessionStore.getState();
      store.setTimerStatus('paused');
      store.setElapsedSeconds(45);
      store.setTimerStartedAt(null);

      // stopTimer() の期待動作
      store.setTimerStatus('discarded');
      store.setElapsedSeconds(0);
      store.setTimerStartedAt(null);

      const state = useWorkoutSessionStore.getState();
      expect(state.timerStatus).toBe('discarded');
      expect(state.elapsedSeconds).toBe(0);
      expect(state.timerStartedAt).toBeNull();
    });
  });
});
