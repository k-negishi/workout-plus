/**
 * ワークアウト関連のアプリ層型定義（camelCase）
 * DB層（snake_case）からRepository層で変換される
 *
 * ## as const パターンについて
 *   Union Type の値を UPPER_SNAKE_CASE のシンボルで参照できるようにしている。
 *   既存の文字列リテラル比較も引き続き型安全に動作する。
 *   例: status === WorkoutStatus.RECORDING  // 推奨
 *       status === 'recording'              // 後方互換として有効
 */

/** ワークアウトの状態 */
export const WorkoutStatus = {
  RECORDING: 'recording',
  COMPLETED: 'completed',
} as const;
export type WorkoutStatus = (typeof WorkoutStatus)[keyof typeof WorkoutStatus];

/**
 * タイマーの状態
 * DB格納値は snake_case で統一（'not_started' 等）
 */
export const TimerStatus = {
  NOT_STARTED: 'not_started',
  RUNNING: 'running',
  PAUSED: 'paused',
  DISCARDED: 'discarded',
} as const;
export type TimerStatus = (typeof TimerStatus)[keyof typeof TimerStatus];

/** 部位カテゴリ */
export const MuscleGroup = {
  CHEST: 'chest',
  BACK: 'back',
  LEGS: 'legs',
  SHOULDERS: 'shoulders',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  ABS: 'abs',
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

/** 器具タイプ */
export const Equipment = {
  BARBELL: 'barbell',
  DUMBBELL: 'dumbbell',
  MACHINE: 'machine',
  CABLE: 'cable',
  BODYWEIGHT: 'bodyweight',
} as const;
export type Equipment = (typeof Equipment)[keyof typeof Equipment];

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
  /** 推定1RM。Epley 式: weight * (1 + reps / 30)。手動更新不可（Repository が自動再計算） */
  estimated1RM: number | null;
  createdAt: number;
  updatedAt: number;
};
