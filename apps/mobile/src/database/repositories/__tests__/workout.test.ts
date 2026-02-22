/**
 * WorkoutRepository のテスト
 * DB操作はモックし、リポジトリのロジック（クエリ構築・戻り値）を検証する
 */
import { WorkoutRepository } from '../workout';

// getDatabase をモックして SQLiteDatabase のスタブを返す
jest.mock('../../client', () => ({
  getDatabase: jest.fn(),
}));

import { getDatabase } from '../../client';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

function createMockDb() {
  return {
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    runAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('WorkoutRepository.findTodayCompleted', () => {
  it('当日の completed ワークアウトを返す', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    // 当日のタイムスタンプ範囲
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const now = dayStart + 3600000; // 当日の1時間後

    const mockRow = {
      id: 'workout-today',
      status: 'completed',
      created_at: now,
      started_at: now - 1800000,
      completed_at: now,
      timer_status: 'notStarted',
      elapsed_seconds: 1800,
      timer_started_at: null,
      memo: null,
    };

    mockDb.getFirstAsync.mockResolvedValue(mockRow);

    const result = await WorkoutRepository.findTodayCompleted();

    expect(result).toEqual(mockRow);
    // クエリが completed_at の範囲指定で呼ばれていることを検証
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      expect.arrayContaining([expect.any(Number), expect.any(Number)]),
    );
  });

  it('当日の完了ワークアウトがない場合は null を返す', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await WorkoutRepository.findTodayCompleted();

    expect(result).toBeNull();
  });

  it('findTodayCompleted が関数として存在する', () => {
    expect(typeof WorkoutRepository.findTodayCompleted).toBe('function');
  });
});

describe('WorkoutRepository.findCompletedByDate', () => {
  it('指定日の completed ワークアウトを返す', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    // 2026-02-14 の dayStart (JST)
    const dayStart = new Date(2026, 1, 14).getTime(); // month は 0-indexed
    const completedAt = dayStart + 3600000; // 当日1時間後

    const mockRow = {
      id: 'workout-feb14',
      status: 'completed',
      created_at: dayStart,
      started_at: dayStart + 1000,
      completed_at: completedAt,
      timer_status: 'not_started',
      elapsed_seconds: 3600,
      timer_started_at: null,
      memo: null,
    };

    mockDb.getFirstAsync.mockResolvedValue(mockRow);

    const result = await WorkoutRepository.findCompletedByDate('2026-02-14');

    expect(result).toEqual(mockRow);
    // completed_at の範囲指定クエリが呼ばれていることを検証
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      expect.arrayContaining([expect.any(Number), expect.any(Number)]),
    );
  });

  it('指定日にワークアウトがない場合は null を返す', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await WorkoutRepository.findCompletedByDate('2026-02-14');

    expect(result).toBeNull();
  });

  it('findCompletedByDate が関数として存在する', () => {
    expect(typeof WorkoutRepository.findCompletedByDate).toBe('function');
  });
});

describe('WorkoutRepository.create（createdAt オプション）', () => {
  it('createdAt を指定すると INSERT クエリに渡される', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    const specificMs = new Date(2026, 1, 14).getTime();
    const mockRow = {
      id: 'workout-past',
      status: 'recording',
      created_at: specificMs,
      started_at: null,
      completed_at: null,
      timer_status: 'not_started',
      elapsed_seconds: 0,
      timer_started_at: null,
      memo: null,
    };
    mockDb.getFirstAsync.mockResolvedValue(mockRow);

    await WorkoutRepository.create({ createdAt: specificMs });

    // INSERT が specificMs を使っていることを検証
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workouts'),
      expect.arrayContaining([specificMs]),
    );
  });

  it('createdAt を省略すると Date.now() 相当の値が使われる', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    const beforeCall = Date.now();
    const mockRow = {
      id: 'workout-now',
      status: 'recording',
      created_at: beforeCall,
      started_at: null,
      completed_at: null,
      timer_status: 'not_started',
      elapsed_seconds: 0,
      timer_started_at: null,
      memo: null,
    };
    mockDb.getFirstAsync.mockResolvedValue(mockRow);

    await WorkoutRepository.create();
    const afterCall = Date.now();

    const callArgs = mockDb.runAsync.mock.calls[0] as [string, (string | number | null)[]];
    const passedMs = callArgs[1][1] as number; // INSERT VALUES の created_at は第2引数
    expect(passedMs).toBeGreaterThanOrEqual(beforeCall);
    expect(passedMs).toBeLessThanOrEqual(afterCall);
  });
});
