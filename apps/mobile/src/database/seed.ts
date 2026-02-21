/**
 * プリセット種目のシードデータ
 * 7部位 × 各5〜10種目 = 約50種目
 */
import { ulid } from 'ulid';

import type { Equipment, MuscleGroup } from './types';

type SeedExercise = {
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
};

/** プリセット種目リスト */
const SEED_EXERCISES: SeedExercise[] = [
  // 胸 (chest) - 8種目
  { name: 'ベンチプレス', muscle_group: 'chest', equipment: 'barbell' },
  { name: 'ダンベルフライ', muscle_group: 'chest', equipment: 'dumbbell' },
  { name: 'インクラインベンチプレス', muscle_group: 'chest', equipment: 'barbell' },
  { name: 'ダンベルベンチプレス', muscle_group: 'chest', equipment: 'dumbbell' },
  { name: 'チェストプレス', muscle_group: 'chest', equipment: 'machine' },
  { name: 'ケーブルクロスオーバー', muscle_group: 'chest', equipment: 'cable' },
  { name: 'ディップス', muscle_group: 'chest', equipment: 'bodyweight' },
  { name: 'ペックフライ', muscle_group: 'chest', equipment: 'machine' },

  // 背中 (back) - 8種目
  { name: 'デッドリフト', muscle_group: 'back', equipment: 'barbell' },
  { name: 'ラットプルダウン', muscle_group: 'back', equipment: 'cable' },
  { name: 'ベントオーバーロウ', muscle_group: 'back', equipment: 'barbell' },
  { name: 'シーテッドロウ', muscle_group: 'back', equipment: 'cable' },
  { name: 'チンアップ', muscle_group: 'back', equipment: 'bodyweight' },
  { name: 'ダンベルロウ', muscle_group: 'back', equipment: 'dumbbell' },
  { name: 'Tバーロウ', muscle_group: 'back', equipment: 'barbell' },
  { name: 'プルアップ', muscle_group: 'back', equipment: 'bodyweight' },

  // 脚 (legs) - 8種目
  { name: 'スクワット', muscle_group: 'legs', equipment: 'barbell' },
  { name: 'レッグプレス', muscle_group: 'legs', equipment: 'machine' },
  { name: 'レッグカール', muscle_group: 'legs', equipment: 'machine' },
  { name: 'レッグエクステンション', muscle_group: 'legs', equipment: 'machine' },
  { name: 'カーフレイズ', muscle_group: 'legs', equipment: 'machine' },
  { name: 'ブルガリアンスクワット', muscle_group: 'legs', equipment: 'dumbbell' },
  { name: 'ルーマニアンデッドリフト', muscle_group: 'legs', equipment: 'barbell' },
  { name: 'ヒップスラスト', muscle_group: 'legs', equipment: 'barbell' },

  // 肩 (shoulders) - 7種目
  { name: 'オーバーヘッドプレス', muscle_group: 'shoulders', equipment: 'barbell' },
  { name: 'サイドレイズ', muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'フロントレイズ', muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'フェイスプル', muscle_group: 'shoulders', equipment: 'cable' },
  { name: 'アップライトロウ', muscle_group: 'shoulders', equipment: 'barbell' },
  { name: 'ショルダープレス', muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'リアデルトフライ', muscle_group: 'shoulders', equipment: 'dumbbell' },

  // 二頭 (biceps) - 6種目
  { name: 'バーベルカール', muscle_group: 'biceps', equipment: 'barbell' },
  { name: 'ダンベルカール', muscle_group: 'biceps', equipment: 'dumbbell' },
  { name: 'ハンマーカール', muscle_group: 'biceps', equipment: 'dumbbell' },
  { name: 'プリーチャーカール', muscle_group: 'biceps', equipment: 'machine' },
  { name: 'インクラインダンベルカール', muscle_group: 'biceps', equipment: 'dumbbell' },
  { name: 'ケーブルカール', muscle_group: 'biceps', equipment: 'cable' },

  // 三頭 (triceps) - 6種目
  { name: 'トライセップスプッシュダウン', muscle_group: 'triceps', equipment: 'cable' },
  { name: 'オーバーヘッドエクステンション', muscle_group: 'triceps', equipment: 'dumbbell' },
  { name: 'クローズグリップベンチプレス', muscle_group: 'triceps', equipment: 'barbell' },
  { name: 'スカルクラッシャー', muscle_group: 'triceps', equipment: 'barbell' },
  { name: 'トライセップスキックバック', muscle_group: 'triceps', equipment: 'dumbbell' },
  { name: 'ディップス（三頭）', muscle_group: 'triceps', equipment: 'bodyweight' },

  // 腹 (abs) - 5種目
  { name: 'クランチ', muscle_group: 'abs', equipment: 'bodyweight' },
  { name: 'プランク', muscle_group: 'abs', equipment: 'bodyweight' },
  { name: 'レッグレイズ', muscle_group: 'abs', equipment: 'bodyweight' },
  { name: 'アブローラー', muscle_group: 'abs', equipment: 'bodyweight' },
  { name: 'ハンギングレッグレイズ', muscle_group: 'abs', equipment: 'bodyweight' },
];

/**
 * プリセット種目のINSERT文を生成する
 * シードデータは冪等（INSERT OR IGNORE）
 */
export function generateSeedSQL(): string {
  const now = Date.now();
  const values = SEED_EXERCISES.map((exercise) => {
    const id = ulid();
    return `('${id}', '${exercise.name}', '${exercise.muscle_group}', '${exercise.equipment}', 0, 0, ${now}, ${now})`;
  });

  return `INSERT OR IGNORE INTO exercises (id, name, muscle_group, equipment, is_custom, is_favorite, created_at, updated_at) VALUES
${values.join(',\n')};`;
}
