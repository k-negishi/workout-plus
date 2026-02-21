/**
 * パーソナルレコード（PR）のアプリ層型定義
 */

/** PR種別 */
export type PRType = 'max_weight' | 'max_volume' | 'max_reps';

/** パーソナルレコード */
export type PersonalRecord = {
  id: string;
  exerciseId: string;
  prType: PRType;
  value: number;
  workoutId: string;
  achievedAt: number;
};

/** ワークアウト完了時のPR達成情報（サマリー表示用） */
export type PRAchievement = {
  exerciseName: string;
  prType: PRType;
  newValue: number;
  previousValue: number | null;
};
