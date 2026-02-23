/**
 * DB層の行型定義
 * SQLiteのカラム名（snake_case）に対応する型
 * アプリ層（camelCase）への変換はRepository層で行う
 *
 * ## Single Source of Truth（SSOT）
 *   Union Type（WorkoutStatus, TimerStatus, MuscleGroup, Equipment, PRType）の定義は
 *   アプリ層（src/types/）が Single Source of Truth。
 *   このファイルは Row型のみを保持し、Union Type は types/ から re-export する。
 */

import type { PRType } from '../types/pr';
import type { Equipment, MuscleGroup, TimerStatus, WorkoutStatus } from '../types/workout';

// Union Type の SSOT は src/types/。re-export のみ。
export type { Equipment, MuscleGroup, TimerStatus, WorkoutStatus };
export type { PRType };

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
  /** 完了日付 yyyy-MM-dd（ローカル時刻）。recording 中は NULL */
  workout_date: string | null;
};

/** exercises テーブル行型 */
export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  /** 0: プリセット、1: ユーザー作成カスタム */
  is_custom: 0 | 1;
  /** 0: 通常、1: お気に入り */
  is_favorite: 0 | 1;
  created_at: number;
  updated_at: number;
  /** ユーザー定義の並び順。ExerciseReorderModal で変更可能 */
  sort_order: number;
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
