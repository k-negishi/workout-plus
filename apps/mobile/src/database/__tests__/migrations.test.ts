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
      schemaVersion = Number.parseInt(match[1], 10);
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
    const oldCompleted = 1_769_871_600_000; // 2026-02-01 00:00 JST
    const newCompleted = 1_769_878_800_000; // 2026-02-01 02:00 JST

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

  it('バージョン 5 からは V6 〜 V11 の 6 回マイグレーションが実行されること', async () => {
    const db = createMockDb(5);

    await runMigrations(db as unknown as SQLiteDatabase);

    // v5 → v6 → v7 → v8 → v9 → v10 → v11 の 6 回マイグレーション（LATEST_VERSION = 11 のため）
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(6);
  });
});

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
      schemaVersion = Number.parseInt(match[1], 10);
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

describe('runMigrations V5 → V6', () => {
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

  it('既にバージョン 11（最新）の場合はマイグレーションをスキップすること', async () => {
    let schemaVersion = 11;
    const db = {
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
        return null;
      }),
      getAllAsync: jest.fn(async () => []),
      execAsync: jest.fn(async (sql: string) => {
        const match = sql.match(/PRAGMA user_version = (\d+)/);
        if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
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
        if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
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
        if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
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
    if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
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

describe('runMigrations V8 → V9: dev fixture 整合性確保', () => {
  const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
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

  it('V9 マイグレーション内で予期しないエラーが発生しても runMigrations が正常終了し schema version が 9 に更新されること', async () => {
    // このテストは migrateV8ToV9 が try-catch を持つことを検証する
    // 具体的なシナリオ: exercises テーブルへのアクセス時に予期しない DB エラーが発生した場合
    const db = createMockDbV8({ fixtureCount: 0 });

    // exercises 名前検索で予期しないエラーを throw → ensureDevWorkoutFixtures が throw する
    db.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA user_version') return { user_version: db.getSchemaVersion() };
      if (sql.includes("FROM workouts WHERE id LIKE 'dev-fixture-workout-%'")) return { count: 0 };
      // 種目検索・その他すべてのクエリで DB エラーをシミュレート
      throw new Error('FOREIGN KEY constraint failed (Error code 19)');
    });

    // エラーが発生しても runMigrations が throw しないこと（try-catch で吸収される）
    await expect(runMigrations(db as unknown as SQLiteDatabase)).resolves.toBeUndefined();

    // schema version が最新（11）に更新されていること（V9 完了扱い → V10・V11 も続けて実行）
    expect(db.getSchemaVersion()).toBe(11);
  });

  it('__DEV__ = false のとき V9 マイグレーションは workouts を INSERT しないこと', async () => {
    // __DEV__ = false の場合、V9 の dev fixture INSERT は実行されない
    // V10 は dev fixture の cleanup（DELETE のみ）なので __DEV__ に関わらず実行される
    globalWithDev.__DEV__ = false;
    const db = createMockDbV8({ fixtureCount: 0 });

    await runMigrations(db as unknown as SQLiteDatabase);

    // workouts への INSERT は実行されないこと（V9 は dev fixture 投入をスキップ）
    const execCalls = db.execAsync.mock.calls.map((call) => String(call[0]));
    const hasWorkoutInsert = execCalls.some((sql) =>
      sql.includes('INSERT OR IGNORE INTO workouts'),
    );
    expect(hasWorkoutInsert).toBe(false);
  });
});

/**
 * V9 スタートの mockDb を生成するヘルパー。
 * V10 マイグレーション（dev fixture の安全なクリーンアップ）が呼ぶ SQL パターンに対応する。
 * CASCADE に依存せず、personal_records (CASCADE なし FK) を先に削除することで
 * FK 制約違反を防ぐ。
 */
function createMockDbV9() {
  let schemaVersion = 9;
  const deleteOrder: string[] = [];

  const getFirstAsync = jest.fn(async (sql: string) => {
    if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
    return null;
  });

  const getAllAsync = jest.fn(async () => []);

  const execAsync = jest.fn(async (sql: string) => {
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
  });

  const runAsync = jest.fn(async (sql: string) => {
    // DELETE 文の実行順を記録する
    if (sql.includes('DELETE FROM personal_records')) deleteOrder.push('personal_records');
    else if (sql.includes('DELETE FROM sets')) deleteOrder.push('sets');
    else if (sql.includes('DELETE FROM workout_exercises')) deleteOrder.push('workout_exercises');
    else if (sql.includes('DELETE FROM workouts')) deleteOrder.push('workouts');
  });

  const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
    await callback();
  });

  return {
    getSchemaVersion: () => schemaVersion,
    getDeleteOrder: () => deleteOrder,
    getFirstAsync,
    getAllAsync,
    execAsync,
    runAsync,
    withTransactionAsync,
  } as unknown as jest.Mocked<SQLiteDatabase> & {
    getSchemaVersion: () => number;
    getDeleteOrder: () => string[];
    getFirstAsync: jest.Mock;
    getAllAsync: jest.Mock;
    execAsync: jest.Mock;
    runAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
  };
}

describe('runMigrations V9 → V10: dev fixture の安全なクリーンアップ', () => {
  it('personal_records → sets → workout_exercises → workouts の順で dev fixture データを DELETE すること', async () => {
    const db = createMockDbV9();

    await runMigrations(db as unknown as SQLiteDatabase);

    const order = db.getDeleteOrder();

    // 4 テーブルすべてが DELETE されること
    expect(order).toContain('personal_records');
    expect(order).toContain('sets');
    expect(order).toContain('workout_exercises');
    expect(order).toContain('workouts');

    // personal_records が workouts より前に削除されること（CASCADE なし FK 制約のため）
    expect(order.indexOf('personal_records')).toBeLessThan(order.indexOf('workouts'));

    // workout_exercises・sets が workouts より前に削除されること
    expect(order.indexOf('workout_exercises')).toBeLessThan(order.indexOf('workouts'));
  });

  it('V10 の DELETE は dev-fixture-workout-% パターンに限定されること', async () => {
    const db = createMockDbV9();

    await runMigrations(db as unknown as SQLiteDatabase);

    // runAsync の引数をすべて取得
    const runCalls = db.runAsync.mock.calls as [string, unknown[]][];
    const deleteCalls = runCalls.filter(([sql]) => sql.startsWith('DELETE'));

    // すべての DELETE が dev fixture 限定であること（全テーブルへの全削除防止）
    for (const [, params] of deleteCalls) {
      const paramStr = JSON.stringify(params);
      expect(paramStr).toMatch(/dev-fixture/);
    }
  });

  it('V10 マイグレーション後 schema version が 11（最新）に更新されること', async () => {
    const db = createMockDbV9();

    await runMigrations(db as unknown as SQLiteDatabase);

    // V9→10 の後、V10→11 も続けて実行されるため最終バージョンは 11
    expect(db.getSchemaVersion()).toBe(11);
  });
});

/**
 * V10 スタートの mockDb を生成するヘルパー。
 * V11 マイグレーション（プリセット種目の差分追加）が呼ぶ SQL パターンに対応する。
 */
function createMockDbV10() {
  let schemaVersion = 10;

  const getFirstAsync = jest.fn(async (sql: string) => {
    if (sql === 'PRAGMA user_version') return { user_version: schemaVersion };
    return null;
  });

  const getAllAsync = jest.fn(async () => []);

  const execAsync = jest.fn(async (sql: string) => {
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match?.[1] != null) schemaVersion = Number.parseInt(match[1], 10);
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

describe('runMigrations V10 → V11: プリセット種目の差分追加', () => {
  it('SEED_EXERCISES の全件が WHERE NOT EXISTS チェック付きで INSERT されること', async () => {
    const db = createMockDbV10();

    await runMigrations(db as unknown as SQLiteDatabase);

    // runAsync が各プリセット種目に対して呼ばれること
    const runCalls = db.runAsync.mock.calls as [string, unknown[]][];
    const exerciseInserts = runCalls.filter(
      ([sql]) => sql.includes('INSERT INTO exercises') && sql.includes('WHERE NOT EXISTS'),
    );

    // SEED_EXERCISES は 55 件（chest:9 + back:12 + legs:8 + shoulders:8 + biceps:7 + triceps:6 + abs:5）
    expect(exerciseInserts.length).toBe(55);
  });

  it('「インクラインチェストプレス」が INSERT 対象に含まれること（実際に欠落していた種目）', async () => {
    const db = createMockDbV10();

    await runMigrations(db as unknown as SQLiteDatabase);

    const runCalls = db.runAsync.mock.calls as [string, unknown[]][];
    const exerciseInserts = runCalls.filter(
      ([sql]) => sql.includes('INSERT INTO exercises') && sql.includes('WHERE NOT EXISTS'),
    );

    const hasInklineChestPress = exerciseInserts.some(
      ([, params]) => Array.isArray(params) && params.includes('インクラインチェストプレス'),
    );
    expect(hasInklineChestPress).toBe(true);
  });

  it('V11 マイグレーション後 schema version が 11 に更新されること', async () => {
    const db = createMockDbV10();

    await runMigrations(db as unknown as SQLiteDatabase);

    expect(db.getSchemaVersion()).toBe(11);
  });
});
