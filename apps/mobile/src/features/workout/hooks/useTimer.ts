/**
 * ワークアウトタイマーフック
 * not_started → running → paused → running / discarded の状態遷移を管理
 * バックグラウンド復帰時も正確な経過時間を算出する
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { WorkoutRepository } from '@/database/repositories/workout';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { TimerStatus } from '@/types';

/** タイマーフックの戻り値型 */
export type UseTimerReturn = {
  /** 現在のタイマー状態 */
  timerStatus: TimerStatus;
  /** 経過秒数 */
  elapsedSeconds: number;
  /** タイマーを開始する */
  startTimer: () => void;
  /** タイマーを一時停止する */
  pauseTimer: () => void;
  /** タイマーを再開する */
  resumeTimer: () => void;
  /** タイマーをリセットする */
  resetTimer: () => void;
  /** タイマー計測を破棄する（ワークアウトは継続） */
  stopTimer: () => void;
  /** discarded 状態から 0:00 でタイマーを再開する（Issue #175） */
  resetAndStartTimer: () => void;
  /** 経過秒数を手動でセットする（paused/discarded 時のみ有効、Issue #175） */
  setManualTime: (seconds: number) => void;
};

/**
 * ワークアウトタイマーを管理するカスタムフック
 */
export function useTimer(): UseTimerReturn {
  const {
    timerStatus,
    elapsedSeconds,
    timerStartedAt,
    currentWorkout,
    setTimerStatus,
    setElapsedSeconds,
    setTimerStartedAt,
  } = useWorkoutSessionStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** インターバルをクリアするヘルパー */
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** 現在の経過秒数を正確に計算する */
  const calculateCurrentElapsed = useCallback((): number => {
    if (timerStartedAt == null) {
      return elapsedSeconds;
    }
    const additionalSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    return elapsedSeconds + additionalSeconds;
  }, [timerStartedAt, elapsedSeconds]);

  /** DB に現在のタイマー状態を永続化する */
  const persistTimerState = useCallback(
    async (status: TimerStatus, elapsed: number, startedAt: number | null) => {
      if (!currentWorkout) return;
      await WorkoutRepository.update(currentWorkout.id, {
        timer_status: status,
        elapsed_seconds: elapsed,
        timer_started_at: startedAt,
      });
    },
    [currentWorkout],
  );

  /** タイマーを開始する（not_started → running） */
  const startTimer = useCallback(() => {
    const now = Date.now();
    setTimerStatus('running');
    setTimerStartedAt(now);
    setElapsedSeconds(0);
    void persistTimerState('running', 0, now);
  }, [setTimerStatus, setTimerStartedAt, setElapsedSeconds, persistTimerState]);

  /** タイマーを一時停止する（running → paused） */
  const pauseTimer = useCallback(() => {
    const totalElapsed = calculateCurrentElapsed();
    clearTimerInterval();
    setTimerStatus('paused');
    setElapsedSeconds(totalElapsed);
    setTimerStartedAt(null);
    void persistTimerState('paused', totalElapsed, null);
  }, [
    calculateCurrentElapsed,
    clearTimerInterval,
    setTimerStatus,
    setElapsedSeconds,
    setTimerStartedAt,
    persistTimerState,
  ]);

  /** タイマーを再開する（paused → running） */
  const resumeTimer = useCallback(() => {
    const now = Date.now();
    setTimerStatus('running');
    setTimerStartedAt(now);
    void persistTimerState('running', elapsedSeconds, now);
  }, [setTimerStatus, setTimerStartedAt, elapsedSeconds, persistTimerState]);

  /** タイマーをリセットする */
  const resetTimer = useCallback(() => {
    clearTimerInterval();
    setTimerStatus(TimerStatus.NOT_STARTED);
    setElapsedSeconds(0);
    setTimerStartedAt(null);
    void persistTimerState(TimerStatus.NOT_STARTED, 0, null);
  }, [clearTimerInterval, setTimerStatus, setElapsedSeconds, setTimerStartedAt, persistTimerState]);

  /** タイマー計測を停止して破棄する（running/paused/not_started → discarded） */
  const stopTimer = useCallback(() => {
    clearTimerInterval();
    setTimerStatus('discarded');
    setElapsedSeconds(0);
    setTimerStartedAt(null);
    void persistTimerState('discarded', 0, null);
  }, [clearTimerInterval, setTimerStatus, setElapsedSeconds, setTimerStartedAt, persistTimerState]);

  /** discarded 状態から 0:00 でタイマーを再開する（Issue #175） */
  const resetAndStartTimer = useCallback(() => {
    const now = Date.now();
    setTimerStatus('running');
    setElapsedSeconds(0);
    setTimerStartedAt(now);
    void persistTimerState('running', 0, now);
  }, [setTimerStatus, setElapsedSeconds, setTimerStartedAt, persistTimerState]);

  /** 経過秒数を手動でセットする（paused/discarded 時のみ有効、Issue #175） */
  const setManualTime = useCallback(
    (seconds: number) => {
      // discarded 状態の場合は paused に遷移して値をセットする
      const newStatus = timerStatus === 'discarded' ? 'paused' : timerStatus;
      if (newStatus === 'paused') {
        setTimerStatus('paused');
        setElapsedSeconds(seconds);
        setTimerStartedAt(null);
        void persistTimerState('paused', seconds, null);
      }
    },
    [timerStatus, setTimerStatus, setElapsedSeconds, setTimerStartedAt, persistTimerState],
  );

  // running 時に 1秒ごとの更新インターバルを管理。
  // deps から elapsedSeconds を意図的に除外している理由:
  //   elapsedSeconds を deps に含めると、interval が発火するたびにストアが更新され
  //   deps の変化が useEffect を再実行 → 新しい interval が積み重なり、
  //   elapsed の増分が等差数列の和（1+2+3=6 秒 ...）となって指数的に速く進む（Issue #149）。
  //   interval のコールバックでは re-render トリガー用の incrementInvalidation() のみを呼び、
  //   表示用の elapsed は displayElapsed として timerStartedAt から毎回計算する。
  useEffect(() => {
    clearTimerInterval();
    if (timerStatus === 'running' && timerStartedAt != null) {
      intervalRef.current = setInterval(() => {
        // elapsedSeconds のベース値を書き換えず、re-render のみをトリガーする
        useWorkoutSessionStore.getState().incrementInvalidation();
      }, 1000);
    }
    return () => clearTimerInterval();
    // elapsedSeconds は deps に含めない（指数的増加バグの回避 — Issue #149 参照）
    // コールバック内では useWorkoutSessionStore.getState() で常に最新値を取得するため問題なし
  }, [timerStatus, timerStartedAt, clearTimerInterval]);

  // バックグラウンド復帰時に経過時間を正確に補正する
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && timerStatus === 'running' && timerStartedAt != null) {
        // フォアグラウンドに戻った時、バックグラウンド中の経過時間を反映
        const totalElapsed = elapsedSeconds + Math.floor((Date.now() - timerStartedAt) / 1000);
        setElapsedSeconds(totalElapsed);
        // timerStartedAt をリセットして新しい基準点にする
        setTimerStartedAt(Date.now());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [timerStatus, timerStartedAt, elapsedSeconds, setElapsedSeconds, setTimerStartedAt]);

  // 表示用の経過秒数: running 中は timerStartedAt からの差分をリアルタイムに加算する。
  // ストアの elapsedSeconds はベース値（一時停止までの累積）であり、
  // running 中は timerStartedAt からの経過を加算することで正確な表示を実現する。
  const displayElapsed =
    timerStatus === 'running' && timerStartedAt != null
      ? elapsedSeconds + Math.floor((Date.now() - timerStartedAt) / 1000)
      : elapsedSeconds;

  return {
    timerStatus,
    elapsedSeconds: displayElapsed,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    stopTimer,
    resetAndStartTimer,
    setManualTime,
  };
}
