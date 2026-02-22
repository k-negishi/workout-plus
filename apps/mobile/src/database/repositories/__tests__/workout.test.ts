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
