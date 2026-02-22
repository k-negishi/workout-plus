/**
 * パーソナルレコード（PR）のアプリ層型定義
 */

/** PR種別 */
export const PRType = {
  MAX_WEIGHT: 'max_weight',
  MAX_VOLUME: 'max_volume',
  MAX_REPS: 'max_reps',
} as const;
export type PRType = (typeof PRType)[keyof typeof PRType];

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
