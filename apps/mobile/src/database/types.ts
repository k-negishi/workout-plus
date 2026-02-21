/**
 * DB層の行型定義
 * SQLiteのカラム名（snake_case）に対応する型
 * アプリ層（camelCase）への変換はRepository層で行う
 */

/** ワークアウトの状態 */
export type WorkoutStatus = 'recording' | 'completed';

/** タイマーの状態 */
export type TimerStatus = 'notStarted' | 'running' | 'paused' | 'discarded';

/** 部位カテゴリ */
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'abs';

/** 器具タイプ */
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

/** PR種別 */
export type PRType = 'max_weight' | 'max_volume' | 'max_reps';

/** workouts テーブル行型 */
export type WorkoutRow = {
  id: string;
  status: WorkoutStatus;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  timer_status: TimerStatus;
  elapsed_seconds: number;
  timer_started_at: number | null;
  memo: string | null;
};

/** exercises テーブル行型 */
export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  is_custom: 0 | 1;
  is_favorite: 0 | 1;
  created_at: number;
  updated_at: number;
};

/** workout_exercises テーブル行型 */
export type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  display_order: number;
  memo: string | null;
  created_at: number;
};

/** sets テーブル行型 */
export type SetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  created_at: number;
  updated_at: number;
};

/** personal_records テーブル行型 */
export type PRRow = {
  id: string;
  exercise_id: string;
  pr_type: PRType;
  value: number;
  workout_id: string;
  achieved_at: number;
};
