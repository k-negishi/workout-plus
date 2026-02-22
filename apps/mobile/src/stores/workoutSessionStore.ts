/**
 * ワークアウトセッションストア（Zustand）
 * 進行中ワークアウトの状態を一元管理する
 * DB永続化はRepository層が担当し、ここはUIの即時反映用
 */
import { create } from 'zustand';

import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';
import { TimerStatus } from '@/types';

type WorkoutSessionState = {
  /** 進行中のワークアウト */
  currentWorkout: Workout | null;
  /** 進行中ワークアウトの種目リスト */
  currentExercises: WorkoutExercise[];
  /** 種目ごとのセットリスト（key: workoutExerciseId） */
  currentSets: Record<string, WorkoutSet[]>;
  /** タイマーの状態 */
  timerStatus: TimerStatus;
  /** 経過秒数 */
  elapsedSeconds: number;
  /** タイマー開始時刻（Date.now()） */
  timerStartedAt: number | null;
  /** UI再描画トリガー用カウンター */
  invalidationCounter: number;
  /** 継続モード時の基準種目IDリスト（null = 通常モード） */
  continuationBaseExerciseIds: string[] | null;
  /** カレンダー画面で選択中の日付（'yyyy-MM-dd'）。+ボタンの過去日付判定に使用 */
  calendarSelectedDate: string | null;
  /** 進行中セッションの対象日付（'yyyy-MM-dd'）。過去日付記録時に completeWorkout が参照する */
  sessionTargetDate: string | null;

  // === アクション ===
  /** 進行中ワークアウトをセット */
  setCurrentWorkout: (workout: Workout | null) => void;
  /** 種目リストを一括セット */
  setExercises: (exercises: WorkoutExercise[]) => void;
  /** 種目を追加 */
  addExercise: (exercise: WorkoutExercise) => void;
  /** 種目を削除 */
  removeExercise: (workoutExerciseId: string) => void;
  /** 種目のセットを一括セット */
  setSetsForExercise: (workoutExerciseId: string, sets: WorkoutSet[]) => void;
  /** 個別セットを部分更新 */
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  /** タイマー状態を更新 */
  setTimerStatus: (status: TimerStatus) => void;
  /** 経過秒数を更新 */
  setElapsedSeconds: (seconds: number) => void;
  /** タイマー開始時刻を更新 */
  setTimerStartedAt: (timestamp: number | null) => void;
  /** invalidationカウンターをインクリメント */
  incrementInvalidation: () => void;
  /** 継続モードの基準種目IDリストをセット */
  setContinuationBaseExerciseIds: (ids: string[] | null) => void;
  /** カレンダー選択日付をセット */
  setCalendarSelectedDate: (date: string | null) => void;
  /** セッション対象日付をセット */
  setSessionTargetDate: (date: string | null) => void;
  /** ストアを初期状態にリセット */
  reset: () => void;
};

const initialState = {
  currentWorkout: null,
  currentExercises: [],
  currentSets: {},
  timerStatus: TimerStatus.NOT_STARTED,
  elapsedSeconds: 0,
  timerStartedAt: null,
  invalidationCounter: 0,
  continuationBaseExerciseIds: null as string[] | null,
  calendarSelectedDate: null as string | null,
  sessionTargetDate: null as string | null,
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set) => ({
  ...initialState,

  setCurrentWorkout: (workout) => set({ currentWorkout: workout }),

  setExercises: (exercises) => set({ currentExercises: exercises }),

  addExercise: (exercise) =>
    set((state) => ({
      currentExercises: [...state.currentExercises, exercise],
    })),

  removeExercise: (workoutExerciseId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [workoutExerciseId]: _removed, ...remainingSets } = state.currentSets;
      return {
        currentExercises: state.currentExercises.filter((e) => e.id !== workoutExerciseId),
        currentSets: remainingSets,
      };
    }),

  setSetsForExercise: (workoutExerciseId, sets) =>
    set((state) => ({
      currentSets: { ...state.currentSets, [workoutExerciseId]: sets },
    })),

  updateSet: (workoutExerciseId, setId, updates) =>
    set((state) => ({
      currentSets: {
        ...state.currentSets,
        [workoutExerciseId]: (state.currentSets[workoutExerciseId] ?? []).map((s) =>
          s.id === setId ? { ...s, ...updates } : s,
        ),
      },
    })),

  setTimerStatus: (status) => set({ timerStatus: status }),

  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),

  setTimerStartedAt: (timestamp) => set({ timerStartedAt: timestamp }),

  incrementInvalidation: () =>
    set((state) => ({
      invalidationCounter: state.invalidationCounter + 1,
    })),

  setContinuationBaseExerciseIds: (ids) => set({ continuationBaseExerciseIds: ids }),

  setCalendarSelectedDate: (date) => set({ calendarSelectedDate: date }),

  setSessionTargetDate: (date) => set({ sessionTargetDate: date }),

  reset: () => set(initialState),
}));
