# Data Model: 設定画面

**Feature**: 20260301-設定画面
**Date**: 2026-03-01

---

## DB スキーマ

### `user_settings` テーブル（新規追加: v8 マイグレーション）

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  weekly_goal_count    INTEGER NOT NULL DEFAULT 3,
  invite_code_unlocked INTEGER NOT NULL DEFAULT 0
);

-- 初期行（INSERT OR IGNORE で冪等）
INSERT OR IGNORE INTO user_settings (id, weekly_goal_count, invite_code_unlocked)
VALUES (1, 3, 0);
```

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, CHECK(id=1) | 常に 1。単一行を強制 |
| `weekly_goal_count` | INTEGER | NOT NULL, DEFAULT 3 | 週の目標ワークアウト回数（1〜7） |
| `invite_code_unlocked` | INTEGER | NOT NULL, DEFAULT 0 | 招待コード解禁フラグ（0=未解禁, 1=解禁済み） |

**設計ポイント**:
- `id = 1` の単一行設計。Upsert (`INSERT OR REPLACE`) または `UPDATE WHERE id = 1` で更新
- 将来の設定追加は `ALTER TABLE user_settings ADD COLUMN` で追記（新しいマイグレーションバージョンで管理）
- SQLite の BOOLEAN は INTEGER（0/1）で表現

---

## TypeScript 型定義

### `database/types.ts` への追加

```typescript
/** user_settings テーブルの行型 */
export type UserSettingsRow = {
  id: 1; // 常に 1
  weekly_goal_count: number; // 1〜7
  invite_code_unlocked: 0 | 1; // 0: 未解禁, 1: 解禁済み
};

/** UserSettings ドメインオブジェクト（型付き） */
export type UserSettings = {
  weeklyGoalCount: number; // 1〜7
  inviteCodeUnlocked: boolean;
};
```

---

## エンティティ定義

### WeeklyGoal（週の目標）

| 属性 | 型 | 制約 | 説明 |
|---|---|---|---|
| `count` | number | 1〜7 の整数 | 週の目標ワークアウト回数 |
| `achievedCount` | number | 0〜count | 今週（月曜起点）の達成済み回数 |

**今週の集計ロジック**:
- 週の開始: 月曜日 00:00:00 JST（`getDay() === 1` で週開始を算出）
- 集計対象: `workout_date >= '2026-MM-DD'` AND `status = 'completed'` の件数
- ホーム画面は `useFocusEffect` で毎回フォーカス時に再取得

### InviteCode（招待コード）

| 属性 | 型 | 説明 |
|---|---|---|
| `isUnlocked` | boolean | 解禁済みか |
| `validCode` | string | ビルド時注入（`process.env.EXPO_PUBLIC_INVITE_CODE`） |

**バリデーションルール**:
- 入力値の前後スペースをトリムしてから比較
- 空文字は「適用」ボタン非活性（バリデーション前にガード）
- `EXPO_PUBLIC_INVITE_CODE` が未設定（空文字）の場合、いかなる入力も無効扱い

---

## 状態遷移（招待コード UI）

```
[初期状態: 未解禁]
    ↓ タップ
[入力フォーム表示]
    ↓ 有効コード入力 → 「適用」タップ
[解禁済み状態] ←─── 永続（アプリ再起動後も維持）
    ↓ 無効コード入力 → 「適用」タップ
[エラー表示] → 再入力可能
```

---

## リポジトリ API

```typescript
// apps/mobile/src/database/repositories/userSettings.ts

export const UserSettingsRepository = {
  /** 設定を取得（行がなければデフォルト値を返す） */
  get: async (): Promise<UserSettings> => { ... },

  /** 週の目標回数を保存（1〜7 の範囲チェック済み） */
  setWeeklyGoalCount: async (count: number): Promise<void> => { ... },

  /** 招待コード解禁フラグを保存 */
  setInviteCodeUnlocked: async (unlocked: boolean): Promise<void> => { ... },
};
```
