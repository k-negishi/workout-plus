/**
 * generateDevWorkoutSeedSQL のテスト
 * - 開発環境かつ fixture 未投入のとき → 6件のワークアウトを投入する
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
  インクラインベンチプレス: 'EX_INCLINE_BENCH',
  ラットプルダウン: 'EX_LAT_PULLDOWN',
  シーテッドロウ: 'EX_SEATED_ROW',
  スクワット: 'EX_SQUAT',
  レッグプレス: 'EX_LEG_PRESS',
  オーバーヘッドプレス: 'EX_OHP',
  サイドレイズ: 'EX_SIDE_RAISE',
  ダンベルベンチプレス: 'EX_DUMBBELL_BENCH',
  デッドリフト: 'EX_DEADLIFT',
  プランク: 'EX_PLANK',
};

describe('generateDevWorkoutSeedSQL', () => {
  const globalWithDev = global as typeof globalThis & { __DEV__?: boolean };
  const originalDev = globalWithDev.__DEV__;

  beforeEach(() => {
    globalWithDev.__DEV__ = true;
  });

  afterAll(() => {
    globalWithDev.__DEV__ = originalDev;
  });

  it('開発環境かつ未投入のとき、6件のダミーワークアウトを投入する', async () => {
    const db = createMockDb();

    db.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) {
        return { count: 0 };
      }

      const match = sql.match(/WHERE name = '(.+)' LIMIT 1/);
      if (!match) {
        return null;
      }
      const exerciseName = match[1].replace(/''/g, "'");
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

    expect(workoutInsertCount).toBe(6);
    expect(workoutExerciseInsertCount).toBe(11);
    expect(setInsertCount).toBe(32);
    expect(sqlList.join('\n')).toContain('dev-fixture-workout-2026-02-20-chest');
  });

  it('fixture が既に投入済みのとき、追加投入しない（冪等性）', async () => {
    const db = createMockDb();

    db.getFirstAsync.mockResolvedValueOnce({ count: 6 });

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
