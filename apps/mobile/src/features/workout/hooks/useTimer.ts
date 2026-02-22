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

  // running 時に 1秒ごとの更新インターバルを管理
  useEffect(() => {
    clearTimerInterval();
    if (timerStatus === 'running' && timerStartedAt != null) {
      intervalRef.current = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
        // ストアの elapsedSeconds はベース値なので、表示用に加算
        useWorkoutSessionStore.setState({
          elapsedSeconds:
            useWorkoutSessionStore.getState().timerStartedAt === timerStartedAt
              ? elapsedSeconds + currentElapsed
              : elapsedSeconds,
        });
      }, 1000);
    }
    return () => clearTimerInterval();
  }, [timerStatus, timerStartedAt, elapsedSeconds, clearTimerInterval]);

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

  // 表示用の経過秒数: running中は timerStartedAt からの差分を加算
  const displayElapsed =
    timerStatus === 'running' && timerStartedAt != null ? elapsedSeconds : elapsedSeconds;

  return {
    timerStatus,
    elapsedSeconds: displayElapsed,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    stopTimer,
  };
}
