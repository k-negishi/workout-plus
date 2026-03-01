/**
 * マイグレーションのテスト
 *
 * V5 マイグレーション: workouts テーブルへの workout_date カラム追加と
 * UNIQUE 部分インデックスの作成を検証する。
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from '../migrations';

/** expo-sqlite の mockDb を型安全に生成するヘルパー */
function createMockDb(initialVersion = 4) {
  // PRAGMA user_version の状態をシミュレートするための変数
  let schemaVersion = initialVersion;

  // getFirstAsync の呼び出しを記録するためのモック
  const getFirstAsync = jest.fn(async (sql: string) => {
    if (sql === 'PRAGMA user_version') {
      return { user_version: schemaVersion };
    }
    return null;
  });

  // getAllAsync の呼び出し結果を管理するモック
  // PRAGMA table_info(workouts): 空配列を返すことで "workout_date カラムが未存在" とみなし、
  //                               ALTER TABLE が実行されるようにシミュレートする
  // SELECT（completedWorkouts）: デフォルトは空配列（各テストで mockResolvedValueOnce を追加設定）
  const getAllAsync = jest.fn(async (sql: string) => {
    if (sql === 'PRAGMA table_info(workouts)') {
      // カラムが未存在の状態をシミュレートする（ALTER TABLE が実行されるべき）
      return [] as { name: string }[];
    }
    return [] as { id: string; completed_at: number }[];
  });

  // execAsync はバージョン更新をシミュレート
  const execAsync = jest.fn(async (sql: string) => {
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match?.[1] != null) {
      schemaVersion = parseInt(match[1], 10);
    }
  });

  const runAsync = jest.fn(async (_sql: string, _params?: unknown[]) => {});

  // withTransactionAsync はコールバックをそのまま実行する
  const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
    await callback();
  });

  return {
    getSchemaVersion: () => schemaVersion,
    getFirstAsync,
    getAllAsync,
    execAsync,
    runAsync,
    withTransactionAsync,
  } as unknown as jest.Mocked<SQLiteDatabase> & {
    getSchemaVersion: () => number;
    getFirstAsync: jest.Mock;
    getAllAsync: jest.Mock;
    execAsync: jest.Mock;
    runAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
  };
}

describe('runMigrations V4 → V5', () => {
  it('マイグレーション V5 実行後に workout_date カラムを追加する ALTER TABLE が実行されること', async () => {
    const db = createMockDb(4);

    await runMigrations(db as unknown as SQLiteDatabase);

    // ALTER TABLE で workout_date カラムが追加されたか確認
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasAlterTable = execCalls.some(
      (sql) => sql.includes('ALTER TABLE workouts') && sql.includes('ADD COLUMN workout_date'),
    );
    expect(hasAlterTable).toBe(true);
  });

  it('マイグレーション V5 実行後に UNIQUE 部分インデックスが作成されること', async () => {
    const db = createMockDb(4);

    await runMigrations(db as unknown as SQLiteDatabase);

    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasUniqueIndex = execCalls.some(
      (sql) =>
        sql.includes('CREATE UNIQUE INDEX') &&
        sql.includes('workout_date') &&
        sql.includes('WHERE workout_date IS NOT NULL'),
    );
    expect(hasUniqueIndex).toBe(true);
  });

  it('既存の completed ワークアウトが同日に複数ある場合、古い方が削除されること', async () => {
    const db = createMockDb(4);

    // 同じ日付（2026-02-01）の 2 件の completed ワークアウト
    const oldCompleted = 1769871600000; // 2026-02-01 00:00 JST
    const newCompleted = 1769878800000; // 2026-02-01 02:00 JST

    // SQL に応じてレスポンスを分岐させる
    // PRAGMA table_info: カラム未存在として ALTER TABLE を実行させる
    // SELECT（completedWorkouts）: 重複する 2 件を返す
    db.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA table_info(workouts)') {
        return [];
      }
      return [
        { id: 'workout-old', completed_at: oldCompleted },
        { id: 'workout-new', completed_at: newCompleted },
      ];
    });

    await runMigrations(db as unknown as SQLiteDatabase);

    // 古いワークアウト（workout-old）が DELETE されているか確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runCalls = db.runAsync.mock.calls as any as [string, string[]][];
    const deletedIds = runCalls
      .filter((call) => call[0].includes('DELETE FROM workouts'))
      .map((call) => call[1][0]);

    expect(deletedIds).toContain('workout-old');
    expect(deletedIds).not.toContain('workout-new');
  });

  it('completed ワークアウトの workout_date が yyyy-MM-dd 形式で正しく算出されること', async () => {
    const db = createMockDb(4);

    // 2026-02-01 02:00 JST（UTC+9）= 2026-01-31 17:00 UTC
    // ローカルタイムで日付を計算するため、実行環境のタイムゾーンに依存
    const completedAt = new Date('2026-02-15T12:00:00.000Z').getTime();

    // SQL に応じてレスポンスを分岐させる
    db.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA table_info(workouts)') {
        return [];
      }
      return [{ id: 'workout-1', completed_at: completedAt }];
    });

    await runMigrations(db as unknown as SQLiteDatabase);

    // UPDATE で workout_date が設定されているか確認
    const runCalls = db.runAsync.mock.calls;
    const updateCalls = runCalls.filter((call) =>
      String(call[0]).includes('UPDATE workouts SET workout_date'),
    );

    expect(updateCalls.length).toBeGreaterThan(0);

    // workout_date が yyyy-MM-dd 形式であることを確認
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedUpdateCalls = updateCalls as any as [string, string[]][];
    for (const call of typedUpdateCalls) {
      const dateStr = call[1][0];
      expect(dateStr).toMatch(datePattern);
    }
  });

  it('recording 状態（workout_date = NULL）のワークアウトは UNIQUE 制約の対象外であること（NULL は重複可能）', async () => {
    const db = createMockDb(4);

    // recording 状態は getAllAsync で返さない（WHERE status = 'completed' のクエリのみ対象）
    // デフォルトモック（createMockDb 内）が全呼び出しで空配列を返すため、ここでは追加設定不要

    await runMigrations(db as unknown as SQLiteDatabase);

    // UNIQUE インデックスは WHERE workout_date IS NOT NULL の部分インデックスである
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const uniqueIndexSql = execCalls.find((sql) => sql.includes('CREATE UNIQUE INDEX'));

    expect(uniqueIndexSql).toBeDefined();
    // NULL を除外する部分インデックスであることを確認
    expect(uniqueIndexSql).toContain('WHERE workout_date IS NOT NULL');
  });

  it('既存データのマイグレーション: completed_at から workout_date が正しく算出されること', async () => {
    const db = createMockDb(4);

    // 2 件の異なる日付の completed ワークアウト
    const completedAt1 = new Date('2026-02-10T08:00:00.000Z').getTime();
    const completedAt2 = new Date('2026-02-20T10:00:00.000Z').getTime();

    // SQL に応じてレスポンスを分岐させる
    db.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA table_info(workouts)') {
        return [];
      }
      return [
        { id: 'workout-a', completed_at: completedAt1 },
        { id: 'workout-b', completed_at: completedAt2 },
      ];
    });

    await runMigrations(db as unknown as SQLiteDatabase);

    // 2 件分の UPDATE が実行されていること
    const runCalls = db.runAsync.mock.calls;
    const updateCalls = runCalls.filter((call) =>
      String(call[0]).includes('UPDATE workouts SET workout_date'),
    );

    expect(updateCalls.length).toBe(2);

    // 各 UPDATE に workout_date と id が正しく渡されているか確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedRunCalls = updateCalls as any as [string, string[]][];
    const updatedIds = typedRunCalls.map((call) => call[1][1]);
    expect(updatedIds).toContain('workout-a');
    expect(updatedIds).toContain('workout-b');
  });

  it('バージョン 5 からは V6, V7, V8, V9 マイグレーションが実行されること', async () => {
    const db = createMockDb(5);

    await runMigrations(db as unknown as SQLiteDatabase);

    // v5 → v6 → v7 → v8 → v9 の 4 回マイグレーションが実行される（LATEST_VERSION = 9 のため）
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(4);
  });
});

describe('runMigrations V5 → V6', () => {
  /**
   * createMockDb の v5 版。exercises テーブルの PRAGMA table_info を返す。
   * sort_order カラム未存在状態をシミュレートする。
   */
  function createMockDbV5() {
    let schemaVersion = 5;

    const getFirstAsync = jest.fn(async (sql: string) => {
      if (sql === 'PRAGMA user_version') {
        return { user_version: schemaVersion };
      }
      // MAX(sort_order) 相当のクエリは今回のマイグレーションでは使わない
      return null;
    });

    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql === 'PRAGMA table_info(exercises)') {
        // sort_order カラムが未存在の状態をシミュレート
        return [] as { name: string }[];
      }
      return [];
    });

    const execAsync = jest.fn(async (sql: string) => {
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match?.[1] != null) {
        schemaVersion = parseInt(match[1], 10);
      }
    });

    const runAsync = jest.fn(async (_sql: string, _params?: unknown[]) => {});

    const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    });

    return {
      getSchemaVersion: () => schemaVersion,
      getFirstAsync,
      getAllAsync,
      execAsync,
      runAsync,
      withTransactionAsync,
    } as unknown as jest.Mocked<SQLiteDatabase> & {
      getSchemaVersion: () => number;
      getFirstAsync: jest.Mock;
      getAllAsync: jest.Mock;
      execAsync: jest.Mock;
      runAsync: jest.Mock;
      withTransactionAsync: jest.Mock;
    };
  }

  it('マイグレーション V6 実行後に sort_order カラムを追加する ALTER TABLE が実行されること', async () => {
    const db = createMockDbV5();

    await runMigrations(db as unknown as SQLiteDatabase);

    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasAlterTable = execCalls.some(
      (sql) => sql.includes('ALTER TABLE exercises') && sql.includes('ADD COLUMN sort_order'),
    );
    expect(hasAlterTable).toBe(true);
  });

  it('マイグレーション V6 実行後に既存種目に sort_order = rowid を設定する UPDATE が実行されること', async () => {
    const db = createMockDbV5();

    await runMigrations(db as unknown as SQLiteDatabase);

    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasUpdateRowid = execCalls.some(
      (sql) =>
        sql.includes('UPDATE exercises') && sql.includes('sort_order') && sql.includes('rowid'),
    );
    expect(hasUpdateRowid).toBe(true);
  });

  it('sort_order カラムが既存の場合は ALTER TABLE をスキップして冪等に実行されること', async () => {
    const db = createMockDbV5();

    // sort_order が既に存在する状態をシミュレート
    db.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA table_info(exercises)') {
        return [{ name: 'sort_order' }] as { name: string }[];
      }
      return [];
    });

    await runMigrations(db as unknown as SQLiteDatabase);

    // ALTER TABLE は実行されないはず
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasAlterTable = execCalls.some(
      (sql) => sql.includes('ALTER TABLE exercises') && sql.includes('ADD COLUMN sort_order'),
    );
    expect(hasAlterTable).toBe(false);
  });

  it('既にバージョン 9（最新）の場合はマイグレーションをスキップすること', async () => {
    let schemaVersion = 9;
    const db = {
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
        return null;
      }),
      getAllAsync: jest.fn(async () => []),
      execAsync: jest.fn(async (sql: string) => {
        const match = sql.match(/PRAGMA user_version = (\d+)/);
        if (match?.[1] != null) schemaVersion = parseInt(match[1], 10);
      }),
      runAsync: jest.fn(async () => {}),
      withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
    } as unknown as jest.Mocked<SQLiteDatabase>;

    await runMigrations(db as unknown as SQLiteDatabase);

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
    expect(db.execAsync).not.toHaveBeenCalled();
  });
});

describe('runMigrations V6 → V7', () => {
  it('is_deleted カラムが追加されること', async () => {
    let schemaVersion = 6;
    const db = {
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
        return null;
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        // PRAGMA table_info: is_deleted が未存在の状態をシミュレート
        if (sql === 'PRAGMA table_info(exercises)') {
          return [{ name: 'id' }, { name: 'name' }, { name: 'sort_order' }] as { name: string }[];
        }
        return [];
      }),
      execAsync: jest.fn(async (sql: string) => {
        const match = sql.match(/PRAGMA user_version = (\d+)/);
        if (match?.[1] != null) schemaVersion = parseInt(match[1], 10);
      }),
      runAsync: jest.fn(async () => {}),
      withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
    } as unknown as jest.Mocked<SQLiteDatabase>;

    await runMigrations(db as unknown as SQLiteDatabase);

    // ALTER TABLE exercises ADD COLUMN is_deleted が実行されていること
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasAlterTable = execCalls.some(
      (sql) => sql.includes('ALTER TABLE exercises') && sql.includes('is_deleted'),
    );
    expect(hasAlterTable).toBe(true);
  });

  it('is_deleted カラムが既に存在する場合は ALTER TABLE を実行しないこと（冪等性）', async () => {
    let schemaVersion = 6;
    const db = {
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
        return null;
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        // is_deleted が既に存在する状態をシミュレート
        if (sql === 'PRAGMA table_info(exercises)') {
          return [{ name: 'is_deleted' }] as { name: string }[];
        }
        return [];
      }),
      execAsync: jest.fn(async (sql: string) => {
        const match = sql.match(/PRAGMA user_version = (\d+)/);
        if (match?.[1] != null) schemaVersion = parseInt(match[1], 10);
      }),
      runAsync: jest.fn(async () => {}),
      withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
    } as unknown as jest.Mocked<SQLiteDatabase>;

    await runMigrations(db as unknown as SQLiteDatabase);

    // ALTER TABLE は実行されないはず
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasAlterTable = execCalls.some(
      (sql) => sql.includes('ALTER TABLE exercises') && sql.includes('is_deleted'),
    );
    expect(hasAlterTable).toBe(false);
  });
});

describe('runMigrations V8 → V9: dev fixture 整合性確保', () => {
  /**
   * V8 スタートの mockDb を生成するヘルパー。
   * V9 マイグレーション（ensureDevWorkoutFixtures）が呼ぶ SQL パターンに対応する。
   */
  function createMockDbV8({ fixtureCount = 0 }: { fixtureCount?: number } = {}) {
    let schemaVersion = 8;

    const getFirstAsync = jest.fn(async (sql: string) => {
      if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
      // dev fixture のカウントクエリ
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) {
        return { count: fixtureCount };
      }
      // fixture workout の存在確認クエリ（INSERT OR IGNORE 後の SELECT id FROM workouts WHERE id = '...'）
      // デフォルト: INSERT 成功とみなして id を返す（競合テストでは mockImplementation で上書き）
      const workoutIdMatch = sql.match(/FROM workouts WHERE id = '(dev-fixture-workout-[^']+)'/);
      if (workoutIdMatch?.[1]) {
        return { id: workoutIdMatch[1] };
      }
      // exercises の名前検索 → ダミー ID を返す（全種目存在するとみなす）
      const match = sql.match(/WHERE name = '(.+)' LIMIT 1/);
      if (match?.[1]) return { id: `EX_${match[1]}` };
      return null;
    });

    const getAllAsync = jest.fn(async () => []);

    const execAsync = jest.fn(async (sql: string) => {
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match?.[1] != null) schemaVersion = parseInt(match[1], 10);
    });

    const runAsync = jest.fn(async () => {});

    const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    });

    return {
      getSchemaVersion: () => schemaVersion,
      getFirstAsync,
      getAllAsync,
      execAsync,
      runAsync,
      withTransactionAsync,
    } as unknown as jest.Mocked<SQLiteDatabase> & {
      getSchemaVersion: () => number;
      getFirstAsync: jest.Mock;
      getAllAsync: jest.Mock;
      execAsync: jest.Mock;
      runAsync: jest.Mock;
      withTransactionAsync: jest.Mock;
    };
  }

  const globalWithDev = global as typeof globalThis & { __DEV__?: boolean };
  const originalDev = globalWithDev.__DEV__;

  beforeEach(() => {
    globalWithDev.__DEV__ = true;
  });

  afterAll(() => {
    if (originalDev === undefined) {
      delete globalWithDev.__DEV__;
    } else {
      globalWithDev.__DEV__ = originalDev;
    }
  });

  it('dev fixture が全件欠落のとき、workout_date 付きで 13 件の workouts を INSERT すること', async () => {
    const db = createMockDbV8({ fixtureCount: 0 });

    await runMigrations(db as unknown as SQLiteDatabase);

    // INSERT OR IGNORE INTO workouts かつ workout_date を含む SQL が 13 件実行されること
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const workoutInserts = execCalls.filter(
      (sql) => sql.includes('INSERT OR IGNORE INTO workouts') && sql.includes('workout_date'),
    );
    expect(workoutInserts.length).toBe(13);
  });

  it('dev fixture が全件欠落のとき、旧データを DELETE してから再投入すること', async () => {
    const db = createMockDbV8({ fixtureCount: 0 });

    await runMigrations(db as unknown as SQLiteDatabase);

    // DELETE FROM workouts WHERE id LIKE ? が呼ばれること
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM workouts WHERE id LIKE ?', [
      'dev-fixture-workout-%',
    ]);
  });

  it('dev fixture が全件存在するとき、workout_date が null の行を UPDATE で補完すること', async () => {
    // fixtureCount = 13（全件存在）→ fillMissingWorkoutDates が呼ばれる
    const db = createMockDbV8({ fixtureCount: 13 });

    await runMigrations(db as unknown as SQLiteDatabase);

    // UPDATE workouts SET workout_date = ? WHERE id = ? AND workout_date IS NULL が 13 件実行されること
    const runCalls = db.runAsync.mock.calls.map((call) => String(call[0]));
    const updateCalls = runCalls.filter(
      (sql) =>
        sql.includes('UPDATE workouts SET workout_date') && sql.includes('workout_date IS NULL'),
    );
    expect(updateCalls.length).toBe(13);
  });

  it('workout_date 競合により workouts INSERT が無視された場合、workout_exercises を挿入せず FK エラーを防ぐこと', async () => {
    // 実機シナリオ: ユーザーが 2026-01-01 に実ワークアウトを記録済みで、
    // dev-fixture-workout-2026-01-01 の INSERT が workout_date UNIQUE 制約でスキップされた状態
    const db = createMockDbV8({ fixtureCount: 0 });
    const conflictingWorkoutId = 'dev-fixture-workout-2026-01-01';

    db.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA user_version') return { user_version: db.getSchemaVersion() };
      // dev fixture カウントクエリ
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) return { count: 0 };
      // 競合 fixture: INSERT OR IGNORE で無視されたため SELECT で見つからない → null
      if (sql.includes(`WHERE id = '${conflictingWorkoutId}'`)) return null;
      // 他の fixture workout は INSERT 成功として id を返す
      const workoutIdMatch = sql.match(/FROM workouts WHERE id = '(dev-fixture-workout-[^']+)'/);
      if (workoutIdMatch?.[1]) return { id: workoutIdMatch[1] };
      // 種目名検索
      const nameMatch = sql.match(/WHERE name = '(.+)' LIMIT 1/);
      if (nameMatch?.[1]) return { id: `EX_${nameMatch[1]}` };
      return null;
    });

    // FK エラーなしで正常完了すること
    await expect(runMigrations(db as unknown as SQLiteDatabase)).resolves.toBeUndefined();

    // 競合 fixture の workout_exercises は INSERT されないこと（FK 制約違反を防ぐ）
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const conflictExerciseInserts = execCalls.filter(
      (sql) =>
        sql.includes('INSERT OR IGNORE INTO workout_exercises') &&
        sql.includes(conflictingWorkoutId),
    );
    expect(conflictExerciseInserts.length).toBe(0);
  });

  it('__DEV__ = false のとき V9 マイグレーションは workouts を変更しないこと', async () => {
    globalWithDev.__DEV__ = false;
    const db = createMockDbV8({ fixtureCount: 0 });

    await runMigrations(db as unknown as SQLiteDatabase);

    // INSERT も DELETE も UPDATE も呼ばれないこと
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasWorkoutInsert = execCalls.some((sql) =>
      sql.includes('INSERT OR IGNORE INTO workouts'),
    );
    expect(hasWorkoutInsert).toBe(false);
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});
