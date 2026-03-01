/**
 * UserSettingsRepository のテスト
 *
 * user_settings テーブルは単一行（id = 1）を持つ。
 * get() は行が存在しない場合にデフォルト値 { weeklyGoalCount: 3, inviteCodeUnlocked: false } を返す。
 * set 系メソッドは UPDATE WHERE id = 1 を実行する。
 */

// getDatabase をモックして SQLiteDatabase のスタブを返す
jest.mock('../../client', () => ({
  getDatabase: jest.fn(),
}));

import { getDatabase } from '../../client';
import { UserSettingsRepository } from '../userSettings';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

function createMockDb() {
  return {
    getFirstAsync: jest.fn(),
    runAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('UserSettingsRepository.get', () => {
  it('行が存在する場合、camelCase 変換した UserSettings を返すこと', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 5,
      invite_code_unlocked: 1,
    });

    const result = await UserSettingsRepository.get();

    expect(result).toEqual({ weeklyGoalCount: 5, inviteCodeUnlocked: true });
  });

  it('行が存在しない場合（null）、デフォルト値を返すこと', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await UserSettingsRepository.get();

    expect(result).toEqual({ weeklyGoalCount: 3, inviteCodeUnlocked: false });
  });

  it('invite_code_unlocked = 0 の場合、inviteCodeUnlocked が false であること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 3,
      invite_code_unlocked: 0,
    });

    const result = await UserSettingsRepository.get();

    expect(result.inviteCodeUnlocked).toBe(false);
  });

  it('WHERE id = 1 でクエリすること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);
    mockDb.getFirstAsync.mockResolvedValue(null);

    await UserSettingsRepository.get();

    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(expect.stringMatching(/WHERE id = 1/i));
  });
});

describe('UserSettingsRepository.setWeeklyGoalCount', () => {
  it('weekly_goal_count を更新するクエリを実行すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await UserSettingsRepository.setWeeklyGoalCount(5);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE user_settings SET weekly_goal_count/i),
      [5],
    );
  });

  it('WHERE id = 1 で更新すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await UserSettingsRepository.setWeeklyGoalCount(7);

    const sql = String(mockDb.runAsync.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/WHERE id = 1/i);
  });
});

describe('UserSettingsRepository.setInviteCodeUnlocked', () => {
  it('true を渡すと invite_code_unlocked = 1 で更新すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await UserSettingsRepository.setInviteCodeUnlocked(true);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE user_settings SET invite_code_unlocked/i),
      [1],
    );
  });

  it('false を渡すと invite_code_unlocked = 0 で更新すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await UserSettingsRepository.setInviteCodeUnlocked(false);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE user_settings SET invite_code_unlocked/i),
      [0],
    );
  });

  it('WHERE id = 1 で更新すること', async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb as never);

    await UserSettingsRepository.setInviteCodeUnlocked(true);

    const sql = String(mockDb.runAsync.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/WHERE id = 1/i);
  });
});
