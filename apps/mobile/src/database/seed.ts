/**
 * プリセット種目のシードデータ
 * 7部位 × 各5〜10種目 = 約50種目
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

const DEV_WORKOUT_ID_PREFIX = 'dev-fixture-workout-';

type DevFixtureSet = {
  weight: number | null;
  reps: number;
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
    id: 'dev-fixture-workout-2026-02-20-chest',
    createdAt: 1771513200000, // 2026-02-20 00:00 JST
    completedAt: 1771518000000, // 2026-02-20 01:20 JST
    elapsedSeconds: 4800,
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 60, reps: 10 },
          { weight: 65, reps: 8 },
          { weight: 70, reps: 5 },
        ],
      },
      {
        name: 'インクラインベンチプレス',
        sets: [
          { weight: 50, reps: 10 },
          { weight: 55, reps: 8 },
          { weight: 55, reps: 6 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-02-18-back',
    createdAt: 1771340400000, // 2026-02-18 00:00 JST
    completedAt: 1771344600000, // 2026-02-18 01:10 JST
    elapsedSeconds: 4200,
    exercises: [
      {
        name: 'ラットプルダウン',
        sets: [
          { weight: 50, reps: 12 },
          { weight: 55, reps: 10 },
          { weight: 60, reps: 8 },
        ],
      },
      {
        name: 'シーテッドロウ',
        sets: [
          { weight: 45, reps: 12 },
          { weight: 50, reps: 10 },
          { weight: 55, reps: 8 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-02-16-legs',
    createdAt: 1771167600000, // 2026-02-16 00:00 JST
    completedAt: 1771173000000, // 2026-02-16 01:30 JST
    elapsedSeconds: 5400,
    exercises: [
      {
        name: 'スクワット',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 85, reps: 6 },
          { weight: 90, reps: 5 },
        ],
      },
      {
        name: 'レッグプレス',
        sets: [
          { weight: 140, reps: 12 },
          { weight: 160, reps: 10 },
          { weight: 180, reps: 8 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-02-12-shoulders',
    createdAt: 1770822000000, // 2026-02-12 00:00 JST
    completedAt: 1770825600000, // 2026-02-12 01:00 JST
    elapsedSeconds: 3600,
    exercises: [
      {
        name: 'オーバーヘッドプレス',
        sets: [
          { weight: 40, reps: 8 },
          { weight: 45, reps: 6 },
          { weight: 45, reps: 5 },
        ],
      },
      {
        name: 'サイドレイズ',
        sets: [
          { weight: 10, reps: 15 },
          { weight: 12, reps: 12 },
          { weight: 12, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-02-08-chest-light',
    createdAt: 1770476400000, // 2026-02-08 00:00 JST
    completedAt: 1770479400000, // 2026-02-08 00:50 JST
    elapsedSeconds: 3000,
    exercises: [
      {
        name: 'ダンベルベンチプレス',
        sets: [
          { weight: 24, reps: 12 },
          { weight: 26, reps: 10 },
          { weight: 28, reps: 8 },
        ],
      },
    ],
  },
  {
    id: 'dev-fixture-workout-2026-02-02-fullbody',
    createdAt: 1769958000000, // 2026-02-02 00:00 JST
    completedAt: 1769960400000, // 2026-02-02 00:40 JST
    elapsedSeconds: 2400,
    exercises: [
      {
        name: 'デッドリフト',
        sets: [
          { weight: 100, reps: 5 },
          { weight: 110, reps: 3 },
        ],
      },
      {
        name: 'プランク',
        sets: [
          { weight: null, reps: 60 },
          { weight: null, reps: 60 },
          { weight: null, reps: 60 },
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
    await db.execAsync(
      `INSERT OR IGNORE INTO sets (id, workout_exercise_id, set_number, weight, reps, created_at, updated_at) VALUES ('${setId}', '${workoutExerciseId}', ${index + 1}, ${weight}, ${set.reps}, ${createdAt}, ${createdAt})`,
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
  if (seededCount >= DEV_WORKOUT_FIXTURES.length) {
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
