/**
 * 種目のアプリ層型定義（camelCase）
 */
import type { Equipment, MuscleGroup } from './workout';

/** 種目 */
export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
  isFavorite: boolean;
  /** 論理削除フラグ（カスタム種目のみ対象）。true の場合は種目選択リストから除外される */
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  /** ユーザー定義の並び順。ExerciseReorderModal で変更可能 */
  sortOrder: number;
};
