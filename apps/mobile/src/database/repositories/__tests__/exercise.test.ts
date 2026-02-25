/**
 * ExerciseRepository のテスト
 *
 * sort_order 対応:
 * - findAll() が sort_order ASC で取得すること
 * - create() が MAX(sort_order) + 1 を設定すること
 * - updateSortOrders() が一括更新すること
 */
import { ExerciseRepository } from '../exercise';

// getDatabase をモックして SQLiteDatabase のスタブを返す
jest.mock('../../client', () => ({
  getDatabase: jest.fn(),
}));

// ulid をモックして固定値を返す（テストの再現性確保）
jest.mock('ulid', () => ({
  ulid: () => 'test-ulid-001',
}));

import { getDatabase } from '../../client';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

function createMockDb() {
  return {
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    }),
  };
}

describe('ExerciseRepository.findAll', () => {
  it('sort_order ASC でクエリすること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getAllAsync.mockResolvedValue([]);

    await ExerciseRepository.findAll();

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/ORDER BY sort_order ASC/i),
    );
  });

  it('muscle_group や name でのソートを使わないこと', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getAllAsync.mockResolvedValue([]);

    await ExerciseRepository.findAll();

    const sql = String(mockDb.getAllAsync.mock.calls[0]?.[0] ?? '');
    // 旧来の muscle_group/name ソートを使っていないことを確認
    expect(sql).not.toMatch(/ORDER BY muscle_group/i);
  });
});

describe('ExerciseRepository.create（sort_order追加）', () => {
  it('作成時に MAX(sort_order) + 1 を sort_order に設定すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    // MAX(sort_order) = 10 を返す
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (String(sql).includes('MAX(sort_order)')) {
        return { max_sort: 10 };
      }
      // 作成後の SELECT * FROM exercises WHERE id = ? の戻り値
      return {
        id: 'test-ulid-001',
        name: 'テスト種目',
        muscle_group: 'chest',
        equipment: 'barbell',
        is_custom: 1,
        is_favorite: 0,
        created_at: 1000,
        updated_at: 1000,
        sort_order: 11,
      };
    });

    await ExerciseRepository.create({
      name: 'テスト種目',
      muscleGroup: 'chest',
      equipment: 'barbell',
    });

    // INSERT が sort_order = 11（10 + 1）で呼ばれていること
    const insertCall = mockDb.runAsync.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO exercises'),
    );
    expect(insertCall).toBeDefined();
    const insertParams = insertCall![1] as unknown[];
    // sort_order の値（11）がパラメータに含まれていること
    expect(insertParams).toContain(11);
  });

  it('種目が1件もない場合は sort_order = 1 で作成されること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    // MAX(sort_order) = null（テーブル空）の場合
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (String(sql).includes('MAX(sort_order)')) {
        return { max_sort: null };
      }
      return {
        id: 'test-ulid-001',
        name: 'テスト種目',
        muscle_group: 'chest',
        equipment: 'barbell',
        is_custom: 1,
        is_favorite: 0,
        created_at: 1000,
        updated_at: 1000,
        sort_order: 1,
      };
    });

    await ExerciseRepository.create({
      name: 'テスト種目',
      muscleGroup: 'chest',
      equipment: 'barbell',
    });

    const insertCall = mockDb.runAsync.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO exercises'),
    );
    const insertParams = insertCall![1] as unknown[];
    // max_sort が null のとき COALESCE で 0 → sort_order = 1
    expect(insertParams).toContain(1);
  });
});

describe('ExerciseRepository.findAll (is_deleted フィルタ)', () => {
  it('クエリに is_deleted = 0 フィルタが含まれること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getAllAsync.mockResolvedValue([]);

    await ExerciseRepository.findAll();

    const sql = String(mockDb.getAllAsync.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/is_deleted\s*=\s*0/i);
  });
});

describe('ExerciseRepository.findById', () => {
  it('指定した ID の行を取得できること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    const fakeRow = {
      id: 'ex-abc',
      name: 'テスト',
      muscle_group: 'chest',
      equipment: 'barbell',
      is_custom: 1,
      is_favorite: 0,
      is_deleted: 0,
      created_at: 1000,
      updated_at: 1000,
      sort_order: 1,
    };
    mockDb.getFirstAsync.mockResolvedValue(fakeRow);

    const result = await ExerciseRepository.findById('ex-abc');

    expect(result).toEqual(fakeRow);
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
      ['ex-abc'],
    );
  });

  it('存在しない ID の場合は null を返すこと', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    // getFirstAsync が null を返すケース
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await ExerciseRepository.findById('not-exist');

    expect(result).toBeNull();
  });
});

describe('ExerciseRepository.softDelete', () => {
  it('is_deleted = 1 に更新するクエリを実行すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await ExerciseRepository.softDelete('ex-target');

    const updateCall = mockDb.runAsync.mock.calls.find((call) =>
      String(call[0]).includes('is_deleted = 1'),
    );
    expect(updateCall).toBeDefined();
    // id パラメータが渡されていること
    const params = updateCall![1] as unknown[];
    expect(params).toContain('ex-target');
  });
});

describe('ExerciseRepository.restore', () => {
  it('is_deleted = 0 に更新するクエリを実行すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await ExerciseRepository.restore('ex-target');

    const updateCall = mockDb.runAsync.mock.calls.find((call) =>
      String(call[0]).includes('is_deleted = 0'),
    );
    expect(updateCall).toBeDefined();
    const params = updateCall![1] as unknown[];
    expect(params).toContain('ex-target');
  });
});

describe('ExerciseRepository.search (is_deleted フィルタ)', () => {
  it('クエリに is_deleted = 0 フィルタが含まれること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getAllAsync.mockResolvedValue([]);

    await ExerciseRepository.search('テスト');

    const sql = String(mockDb.getAllAsync.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/is_deleted\s*=\s*0/i);
  });
});

describe('ExerciseRepository.updateSortOrders', () => {
  it('渡したすべての id に対して UPDATE が実行されること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    const orders = [
      { id: 'ex-1', sortOrder: 1 },
      { id: 'ex-2', sortOrder: 2 },
      { id: 'ex-3', sortOrder: 3 },
    ];

    await ExerciseRepository.updateSortOrders(orders);

    // withTransactionAsync でラップされていること
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

    // 3件の UPDATE が実行されていること
    const updateCalls = mockDb.runAsync.mock.calls.filter((call) =>
      String(call[0]).includes('UPDATE exercises SET sort_order'),
    );
    expect(updateCalls).toHaveLength(3);
  });

  it('sort_order と id が正しいパラメータで UPDATE されること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await ExerciseRepository.updateSortOrders([{ id: 'ex-abc', sortOrder: 5 }]);

    const updateCalls = mockDb.runAsync.mock.calls.filter((call) =>
      String(call[0]).includes('UPDATE exercises SET sort_order'),
    );
    expect(updateCalls[0]![1]).toEqual([5, 'ex-abc']);
  });

  it('空配列を渡した場合は UPDATE が実行されないこと', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await ExerciseRepository.updateSortOrders([]);

    const updateCalls = mockDb.runAsync.mock.calls.filter((call) =>
      String(call[0]).includes('UPDATE exercises SET sort_order'),
    );
    expect(updateCalls).toHaveLength(0);
  });
});
