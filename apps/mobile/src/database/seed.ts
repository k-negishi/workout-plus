/**
 * プリセット種目のシードデータ
 * 7部位 × 各5〜12種目 = 約55種目
 */
import type { SQLiteDatabase } from 'expo-sqlite';
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
  { name: 'インクラインチェストプレス', muscle_group: 'chest', equipment: 'machine' },
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
  { name: 'Strive ラットプルダウン', muscle_group: 'back', equipment: 'cable' },
  { name: 'ハンマーフロントプルダウン', muscle_group: 'back', equipment: 'machine' },
  { name: 'ハンマーローイング', muscle_group: 'back', equipment: 'machine' },
  { name: 'ローイングマシン', muscle_group: 'back', equipment: 'machine' },

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
  { name: 'マシンサイドレイズ', muscle_group: 'shoulders', equipment: 'machine' },
  { name: 'リアデルトフライ', muscle_group: 'shoulders', equipment: 'dumbbell' },

  // 二頭 (biceps) - 6種目
  { name: 'バーベルカール', muscle_group: 'biceps', equipment: 'barbell' },
  { name: 'EZバーカール', muscle_group: 'biceps', equipment: 'barbell' },
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

const DEV_WORKOUT_ID_PREFIX = 'dev-fixture-workout-';

type DevFixtureSet = {
  weight: number | null;
  reps: number | null;
};

type DevFixtureExercise = {
  name: string;
  sets: DevFixtureSet[];
};

type DevFixtureWorkout = {
  id: string;
  createdAt: number;
  completedAt: number;
  elapsedSeconds: number;
  exercises: DevFixtureExercise[];
};

const DEV_WORKOUT_FIXTURES: DevFixtureWorkout[] = [
  {
    id: 'dev-fixture-workout-2026-01-01',
    createdAt: new Date('2026-01-01T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-01T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 50, reps: 5 },
          { weight: 50, reps: 5 },
          { weight: 50, reps: 5 },
        ],
      },
      {
        name: 'インクラインチェストプレス',
        sets: [
          { weight: 42, reps: 11 },
          { weight: 42, reps: 11 },
          { weight: 42, reps: 10 },
        ],
      },
      {
        name: 'チェストプレス',
        sets: [
          { weight: 27, reps: 10 },
          { weight: 27, reps: 10 },
          { weight: 27, reps: 9 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-02',
    createdAt: new Date('2026-01-02T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-02T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'サイドレイズ',
        sets: [
          { weight: 6, reps: 15 },
          { weight: 6, reps: 15 },
          { weight: 6, reps: 11 },
        ],
      },
      {
        name: 'ショルダープレス',
        sets: [
          { weight: 27, reps: 12 },
          { weight: 27, reps: 12 },
          { weight: 27, reps: 10 },
        ],
      },
      {
        name: 'マシンサイドレイズ',
        sets: [
          { weight: 11, reps: 11 },
          { weight: 11, reps: 11 },
          { weight: 11, reps: 12 },
        ],
      },
      {
        name: 'リアデルトフライ',
        sets: [
          { weight: 13, reps: 11 },
          { weight: 13, reps: 11 },
          { weight: 13, reps: 11 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-04',
    createdAt: new Date('2026-01-04T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-04T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ハンマーフロントプルダウン',
        sets: [
          { weight: 15, reps: 14 },
          { weight: 15, reps: 12 },
          { weight: 15, reps: 12 },
        ],
      },
      {
        name: 'ハンマーローイング',
        sets: [
          { weight: 15, reps: 11 },
          { weight: 15, reps: 11 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 35, reps: 11 },
          { weight: 35, reps: 11 },
          { weight: 32.5, reps: 11 },
        ],
      },
      {
        name: 'EZバーカール',
        sets: [
          { weight: 15, reps: 12 },
          { weight: 15, reps: 12 },
          { weight: 15, reps: 12 },
        ],
      },
      {
        name: 'インクラインダンベルカール',
        sets: [
          { weight: 7, reps: 12 },
          { weight: 7, reps: 12 },
          { weight: 7, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-09',
    createdAt: new Date('2026-01-09T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-09T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 60, reps: 1 },
          { weight: 52.5, reps: 5 },
          { weight: 52.5, reps: 2 },
          { weight: 50, reps: 5 },
        ],
      },
      {
        name: 'インクラインチェストプレス',
        sets: [
          { weight: 42, reps: 10 },
          { weight: 42, reps: 11 },
          { weight: 42, reps: 10 },
        ],
      },
      {
        name: 'ショルダープレス',
        sets: [
          { weight: 27, reps: 12 },
          { weight: 27, reps: 11 },
          { weight: 27, reps: 7 },
        ],
      },
      {
        name: 'サイドレイズ',
        sets: [
          { weight: 5, reps: 16 },
          { weight: 5, reps: 14 },
          { weight: 5, reps: 14 },
        ],
      },
      {
        name: 'マシンサイドレイズ',
        sets: [
          { weight: 11, reps: 10 },
          { weight: 11, reps: 10 },
          { weight: 11, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-12',
    createdAt: new Date('2026-01-12T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-12T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 41, reps: 10 },
          { weight: 36, reps: 10 },
          { weight: 36, reps: 9 },
        ],
      },
      {
        name: 'Strive ラットプルダウン',
        sets: [
          { weight: 36, reps: 10 },
          { weight: 36, reps: 10 },
          { weight: 36, reps: 12 },
        ],
      },
      {
        name: 'EZバーカール',
        sets: [
          { weight: 15, reps: 12 },
          { weight: 15, reps: 9 },
          { weight: 15, reps: 12 },
        ],
      },
      {
        name: 'インクラインダンベルカール',
        sets: [
          { weight: 7, reps: 10 },
          { weight: 7, reps: 10 },
          { weight: 7, reps: 9 },
        ],
      },
      {
        name: 'ローイングマシン',
        sets: [
          { weight: 40, reps: 12 },
          { weight: 40, reps: 11 },
          { weight: 40, reps: 11 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-13',
    createdAt: new Date('2026-01-13T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-13T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 52.5, reps: 5 },
          { weight: 52.5, reps: 4 },
          { weight: 50, reps: 5 },
        ],
      },
      {
        name: 'インクラインチェストプレス',
        sets: [
          { weight: 43, reps: 12 },
          { weight: 43, reps: 12 },
          { weight: 43, reps: 10 },
        ],
      },
      {
        name: 'チェストプレス',
        sets: [
          { weight: 27, reps: 12 },
          { weight: 27, reps: 12 },
          { weight: 27, reps: 10 },
        ],
      },
      {
        name: 'サイドレイズ',
        sets: [
          { weight: 6, reps: 14 },
          { weight: 6, reps: 14 },
          { weight: 6, reps: 12 },
        ],
      },
      {
        name: 'マシンサイドレイズ',
        sets: [
          { weight: 11, reps: 10 },
          { weight: 11, reps: 10 },
          { weight: 11, reps: 12 },
        ],
      },
      {
        name: 'ショルダープレス',
        sets: [
          { weight: 27, reps: 12 },
          { weight: 27, reps: 8 },
          { weight: 25, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-18',
    createdAt: new Date('2026-01-18T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-18T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 40, reps: 11 },
          { weight: 37.5, reps: 12 },
          { weight: 35, reps: 12 },
        ],
      },
      {
        name: 'Strive ラットプルダウン',
        sets: [
          { weight: 36, reps: 12 },
          { weight: 36, reps: 14 },
          { weight: 36, reps: 12 },
        ],
      },
      {
        name: 'EZバーカール',
        sets: [
          { weight: 15, reps: 14 },
          { weight: 15, reps: 14 },
          { weight: 15, reps: 12 },
        ],
      },
      {
        name: 'インクラインダンベルカール',
        sets: [
          { weight: 7, reps: 11 },
          { weight: 7, reps: 10 },
          { weight: 7, reps: 10 },
        ],
      },
      {
        name: 'レッグエクステンション',
        sets: [
          { weight: 45, reps: 10 },
          { weight: 45, reps: 10 },
          { weight: 45, reps: 10 },
        ],
      },
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 40, reps: 10 },
          { weight: 40, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-20',
    createdAt: new Date('2026-01-20T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-20T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'チェストプレス',
        sets: [
          { weight: 30, reps: 15 },
          { weight: 30, reps: 12 },
          { weight: 30, reps: 10 },
        ],
      },
      {
        name: 'マシンサイドレイズ',
        sets: [
          { weight: 13, reps: 12 },
          { weight: 13, reps: 12 },
          { weight: 13, reps: 9 },
          { weight: 15, reps: 12 },
          { weight: 15, reps: 12 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: 'リアデルトフライ',
        sets: [
          { weight: 23, reps: 10 },
          { weight: 23, reps: 10 },
          { weight: 23, reps: 10 },
        ],
      },
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 50, reps: 5 },
          { weight: 50, reps: 5 },
          { weight: 47.5, reps: 5 },
          { weight: 47.5, reps: 4 },
        ],
      },
      {
        name: 'インクラインチェストプレス',
        sets: [
          { weight: 43, reps: 10 },
          { weight: 43, reps: 9 },
          { weight: 40, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-21',
    createdAt: new Date('2026-01-21T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-21T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 37.5, reps: 5 },
          { weight: 37.5, reps: 5 },
          { weight: 37.5, reps: 5 },
        ],
      },
      {
        name: 'スクワット',
        sets: [
          { weight: 60, reps: 5 },
          { weight: 60, reps: 5 },
          { weight: 57.5, reps: 5 },
        ],
      },
      {
        name: 'EZバーカール',
        sets: [
          { weight: 27.5, reps: 3 },
          { weight: 25, reps: 9 },
          { weight: 22.5, reps: 10 },
          { weight: 20, reps: null },
        ],
      },
      {
        name: 'インクラインダンベルカール',
        sets: [
          { weight: 7, reps: 10 },
          { weight: 6, reps: 10 },
          { weight: 6, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-23',
    createdAt: new Date('2026-01-23T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-23T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 40, reps: 5 },
          { weight: 40, reps: 5 },
          { weight: 40, reps: 5 },
        ],
      },
      {
        name: 'ハンマーフロントプルダウン',
        sets: [
          { weight: 15, reps: 14 },
          { weight: 15, reps: 14 },
          { weight: 15, reps: 13 },
        ],
      },
      {
        name: 'デッドリフト',
        sets: [
          { weight: 60, reps: 5 },
          { weight: 60, reps: 5 },
          { weight: 60, reps: 5 },
        ],
      },
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 36, reps: 10 },
          { weight: 36, reps: 10 },
          { weight: 36, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-25',
    createdAt: new Date('2026-01-25T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-25T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 52.5, reps: 5 },
          { weight: 52.5, reps: 5 },
          { weight: 52.5, reps: 5 },
          { weight: 52.5, reps: 5 },
        ],
      },
      {
        name: 'サイドレイズ',
        sets: [
          { weight: 5, reps: 14 },
          { weight: 5, reps: 14 },
          { weight: 5, reps: 15 },
        ],
      },
      {
        name: 'インクラインチェストプレス',
        sets: [
          { weight: 43, reps: 13 },
          { weight: 43, reps: 12 },
          { weight: 43, reps: 11 },
        ],
      },
      {
        name: 'マシンサイドレイズ',
        sets: [
          { weight: 11, reps: 11 },
          { weight: 11, reps: 12 },
          { weight: 11, reps: 11 },
        ],
      },
      {
        name: 'チェストプレス',
        sets: [
          { weight: 27, reps: 13 },
          { weight: 27, reps: 10 },
          { weight: 27, reps: 10 },
        ],
      },
      {
        name: 'リアデルトフライ',
        sets: [
          { weight: 23, reps: 10 },
          { weight: 23, reps: 10 },
          { weight: 23, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-28',
    createdAt: new Date('2026-01-28T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-28T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 35, reps: 5 },
          { weight: 35, reps: 5 },
          { weight: 35, reps: 5 },
        ],
      },
      {
        name: 'スクワット',
        sets: [
          { weight: 60, reps: 5 },
          { weight: 60, reps: 5 },
          { weight: 60, reps: 5 },
        ],
      },
      {
        name: 'EZバーカール',
        sets: [
          { weight: 20, reps: 11 },
          { weight: 20, reps: 10 },
          { weight: 20, reps: 10 },
        ],
      },
      {
        name: 'インクラインダンベルカール',
        sets: [
          { weight: 7, reps: 9 },
          { weight: 6, reps: 10 },
          { weight: 6, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-01-30',
    createdAt: new Date('2026-01-30T00:00:00+09:00').getTime(),
    completedAt: new Date('2026-01-30T01:00:00+09:00').getTime(),
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'デッドリフト',
        sets: [
          { weight: 60, reps: 5 },
          { weight: 60, reps: null },
        ],
      },
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 40, reps: 5 },
          { weight: 40, reps: 5 },
          { weight: 40, reps: 5 },
        ],
      },
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 36, reps: 14 },
          { weight: 36, reps: 12 },
          { weight: 36, reps: 10 },
        ],
      },
    ],
  },
];

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : true;
}

async function getSeededFixtureWorkoutCount(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workouts WHERE id LIKE '${DEV_WORKOUT_ID_PREFIX}%'`,
  );
  return result?.count ?? 0;
}

function getRequiredFixtureExerciseNames(): string[] {
  return [
    ...new Set(
      DEV_WORKOUT_FIXTURES.flatMap((workout) => workout.exercises.map((exercise) => exercise.name)),
    ),
  ];
}

async function buildExerciseIdMap(
  db: SQLiteDatabase,
  exerciseNames: string[],
): Promise<Map<string, string> | null> {
  const exerciseIdMap = new Map<string, string>();

  for (const name of exerciseNames) {
    const escapedName = escapeSqlString(name);
    const result = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM exercises WHERE name = '${escapedName}' LIMIT 1`,
    );
    if (!result?.id) {
      return null;
    }
    exerciseIdMap.set(name, result.id);
  }

  return exerciseIdMap;
}

async function insertFixtureSets(
  db: SQLiteDatabase,
  workoutExerciseId: string,
  createdAt: number,
  sets: DevFixtureSet[],
  displayOrder: number,
  workoutId: string,
): Promise<void> {
  for (const [index, set] of sets.entries()) {
    const setId = `dev-fixture-set-${workoutId}-${displayOrder + 1}-${index + 1}`;
    const weight = set.weight === null ? 'NULL' : String(set.weight);
    const reps = set.reps === null ? 'NULL' : String(set.reps);
    await db.execAsync(
      `INSERT OR IGNORE INTO sets (id, workout_exercise_id, set_number, weight, reps, created_at, updated_at) VALUES ('${setId}', '${workoutExerciseId}', ${index + 1}, ${weight}, ${reps}, ${createdAt}, ${createdAt})`,
    );
  }
}

async function insertFixtureExercises(
  db: SQLiteDatabase,
  workout: DevFixtureWorkout,
  exerciseIdMap: Map<string, string>,
): Promise<void> {
  for (const [displayOrder, exercise] of workout.exercises.entries()) {
    const exerciseId = exerciseIdMap.get(exercise.name);
    if (!exerciseId) {
      continue;
    }

    const workoutExerciseId = `dev-fixture-we-${workout.id}-${displayOrder + 1}`;
    await db.execAsync(
      `INSERT OR IGNORE INTO workout_exercises (id, workout_id, exercise_id, display_order, created_at) VALUES ('${workoutExerciseId}', '${workout.id}', '${exerciseId}', ${displayOrder}, ${workout.createdAt})`,
    );

    await insertFixtureSets(
      db,
      workoutExerciseId,
      workout.createdAt,
      exercise.sets,
      displayOrder,
      workout.id,
    );
  }
}

async function insertFixtureWorkout(
  db: SQLiteDatabase,
  workout: DevFixtureWorkout,
  exerciseIdMap: Map<string, string>,
): Promise<void> {
  await db.execAsync(
    `INSERT OR IGNORE INTO workouts (id, status, created_at, completed_at, elapsed_seconds) VALUES ('${workout.id}', 'completed', ${workout.createdAt}, ${workout.completedAt}, ${workout.elapsedSeconds})`,
  );

  await insertFixtureExercises(db, workout, exerciseIdMap);
}

/**
 * 開発用ワークアウトのシードデータを投入する
 *
 * - 開発環境（__DEV__）でのみ実行する
 * - fixed ID + INSERT OR IGNORE で冪等性を担保する
 * - 既存DBが古いバージョンでも、起動時に不足分を補完できる
 */
export async function generateDevWorkoutSeedSQL(db: SQLiteDatabase): Promise<void> {
  if (!isDevelopmentBuild()) {
    return;
  }

  const seededCount = await getSeededFixtureWorkoutCount(db);
  if (seededCount > 0 && seededCount !== DEV_WORKOUT_FIXTURES.length) {
    // fixture構成変更時は旧データを削除し、最新fixtureを再投入する
    await db.runAsync('DELETE FROM workouts WHERE id LIKE ?', [`${DEV_WORKOUT_ID_PREFIX}%`]);
  } else if (seededCount >= DEV_WORKOUT_FIXTURES.length) {
    return;
  }

  const exerciseNames = getRequiredFixtureExerciseNames();
  const exerciseIdMap = await buildExerciseIdMap(db, exerciseNames);
  if (!exerciseIdMap) {
    return;
  }

  for (const workout of DEV_WORKOUT_FIXTURES) {
    await insertFixtureWorkout(db, workout, exerciseIdMap);
  }
}
