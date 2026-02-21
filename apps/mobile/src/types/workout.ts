/**
 * ワークアウト関連のアプリ層型定義（camelCase）
 * DB層（snake_case）からRepository層で変換される
 */

/** ワークアウトの状態 */
export type WorkoutStatus = 'recording' | 'completed';

/** タイマーの状態 */
export type TimerStatus = 'notStarted' | 'running' | 'paused';

/** 部位カテゴリ */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'abs';

/** 器具タイプ */
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight';

/** ワークアウト */
export type Workout = {
  id: string;
  status: WorkoutStatus;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  timerStatus: TimerStatus;
  elapsedSeconds: number;
  timerStartedAt: number | null;
  memo: string | null;
};

/** ワークアウト内の種目 */
export type WorkoutExercise = {
  id: string;
  workoutId: string;
  exerciseId: string;
  displayOrder: number;
  memo: string | null;
  createdAt: number;
};

/** セット（1セット分の記録） */
export type WorkoutSet = {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  estimated1rm: number | null;
  createdAt: number;
  updatedAt: number;
};
