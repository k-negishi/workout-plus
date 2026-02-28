/**
 * generateDevWorkoutSeedSQL のテスト
 * - 開発環境かつ fixture 未投入のとき → CSV由来の13件ワークアウトを投入する
 * - fixture が既に投入済みのとき → スキップする（冪等性）
 * - 本番環境（__DEV__ = false）では何もしない
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { generateDevWorkoutSeedSQL } from '../seed';

/** expo-sqlite の mockDb を型安全に生成するヘルパー */
function createMockDb() {
  return {
    getFirstAsync: jest.fn(),
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SQLiteDatabase> & {
    getFirstAsync: jest.Mock;
    execAsync: jest.Mock;
    runAsync: jest.Mock;
  };
}

const EXERCISE_ID_BY_NAME: Record<string, string> = {
  ベンチプレス: 'EX_BENCH',
  インクラインチェストプレス: 'EX_INCLINE_CHEST_PRESS',
  チェストプレス: 'EX_CHEST_PRESS',
  サイドレイズ: 'EX_SIDE_RAISE',
  ショルダープレス: 'EX_SHOULDER_PRESS',
  マシンサイドレイズ: 'EX_MACHINE_SIDE_RAISE',
  リアデルトフライ: 'EX_REAR_DELT_FLY',
  ハンマーフロントプルダウン: 'EX_HAMMER_FRONT_PULLDOWN',
  ハンマーローイング: 'EX_HAMMER_ROWING',
  ラットプルダウン: 'EX_LAT_PULLDOWN',
  'Strive ラットプルダウン': 'EX_STRIVE_LAT_PULLDOWN',
  EZバーカール: 'EX_EZ_CURL',
  インクラインダンベルカール: 'EX_INCLINE_DUMBBELL_CURL',
  ローイングマシン: 'EX_ROWING_MACHINE',
  スクワット: 'EX_SQUAT',
  レッグエクステンション: 'EX_LEG_EXTENSION',
  デッドリフト: 'EX_DEADLIFT',
};

describe('generateDevWorkoutSeedSQL', () => {
  const globalWithDev = global as typeof globalThis & { __DEV__?: boolean };
  const originalDev = globalWithDev.__DEV__;

  beforeEach(() => {
    globalWithDev.__DEV__ = true;
  });

  afterAll(() => {
    if (originalDev === undefined) {
      delete globalWithDev.__DEV__;
      return;
    }

    globalWithDev.__DEV__ = originalDev;
  });

  it('開発環境かつ未投入のとき、CSV由来の13件ワークアウトを投入する', async () => {
    const db = createMockDb();

    db.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) {
        return { count: 0 };
      }

      const match = sql.match(/WHERE name = '(.+)' LIMIT 1/);
      if (!match) {
        return null;
      }
      const rawExerciseName = match[1];
      if (rawExerciseName == null) {
        return null;
      }
      const exerciseName = rawExerciseName.replace(/''/g, "'");
      const exerciseId = EXERCISE_ID_BY_NAME[exerciseName];
      return exerciseId ? { id: exerciseId } : null;
    });

    await generateDevWorkoutSeedSQL(db as unknown as SQLiteDatabase);

    const sqlList = db.execAsync.mock.calls.map((call) => String(call[0]));
    const workoutInsertCount = sqlList.filter((sql) =>
      sql.includes('INSERT OR IGNORE INTO workouts'),
    ).length;
    const workoutExerciseInsertCount = sqlList.filter((sql) =>
      sql.includes('INSERT OR IGNORE INTO workout_exercises'),
    ).length;
    const setInsertCount = sqlList.filter((sql) =>
      sql.includes('INSERT OR IGNORE INTO sets'),
    ).length;

    expect(workoutInsertCount).toBe(13);
    expect(workoutExerciseInsertCount).toBe(60);
    expect(setInsertCount).toBe(185);
    expect(sqlList.join('\n')).toContain('dev-fixture-workout-2026-01-30');
  });

  it('旧fixtureが残っているとき、再投入前に旧fixtureを削除する', async () => {
    const db = createMockDb();

    db.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) {
        return { count: 6 };
      }

      const match = sql.match(/WHERE name = '(.+)' LIMIT 1/);
      if (!match) {
        return null;
      }
      const rawExerciseName = match[1];
      if (rawExerciseName == null) {
        return null;
      }
      const exerciseName = rawExerciseName.replace(/''/g, "'");
      const exerciseId = EXERCISE_ID_BY_NAME[exerciseName];
      return exerciseId ? { id: exerciseId } : null;
    });

    await generateDevWorkoutSeedSQL(db as unknown as SQLiteDatabase);

    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM workouts WHERE id LIKE ?', [
      'dev-fixture-workout-%',
    ]);
  });

  it('fixture が既に投入済みのとき、追加投入しない（冪等性）', async () => {
    const db = createMockDb();

    db.getFirstAsync.mockResolvedValueOnce({ count: 13 });

    await generateDevWorkoutSeedSQL(db as unknown as SQLiteDatabase);

    expect(db.getFirstAsync).toHaveBeenCalledTimes(1);
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it('本番環境ではダミーデータを投入しない', async () => {
    const db = createMockDb();
    globalWithDev.__DEV__ = false;

    await generateDevWorkoutSeedSQL(db as unknown as SQLiteDatabase);

    expect(db.getFirstAsync).not.toHaveBeenCalled();
    expect(db.execAsync).not.toHaveBeenCalled();
  });
});
