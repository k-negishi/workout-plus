/**
 * UserSettingsRepository
 *
 * user_settings テーブルを操作するリポジトリ。
 * テーブルは常に id = 1 の単一行を持つ（マイグレーション v8 で初期化）。
 */
import { getDatabase } from '../client';
import type { UserSettings, UserSettingsRow } from '../types';

export const UserSettingsRepository = {
  /** 設定を取得する（行がなければデフォルト値を返す） */
  async get(): Promise<UserSettings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserSettingsRow>('SELECT * FROM user_settings WHERE id = 1');
    if (row == null) {
      // マイグレーション未実行環境へのフォールバック
      return { weeklyGoalCount: 3, inviteCodeUnlocked: false };
    }
    return {
      weeklyGoalCount: row.weekly_goal_count,
      inviteCodeUnlocked: row.invite_code_unlocked === 1,
    };
  },

  /** 週の目標回数を保存する（1〜7 の範囲で呼び出し元が保証する） */
  async setWeeklyGoalCount(count: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE user_settings SET weekly_goal_count = ? WHERE id = 1', [count]);
  },

  /** 招待コード解禁フラグを保存する */
  async setInviteCodeUnlocked(unlocked: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE user_settings SET invite_code_unlocked = ? WHERE id = 1', [
      unlocked ? 1 : 0,
    ]);
  },
};
