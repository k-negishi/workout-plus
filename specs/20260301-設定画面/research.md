# Research: 設定画面

**Feature**: 20260301-設定画面
**Phase**: Phase 0 Research
**Date**: 2026-03-01

---

## 1. ナビゲーション構造の調査

### 決定: タブバーの5つ目のタブとして実装

**根拠**:
- ユーザー確認済み（セッション 2026-03-01）
- 既存の `MainTabs.tsx` は4タブ構成（HomeTab / CalendarTab / StatsTab / AITab）
- `CustomTabBar` はフレックスレイアウトで `state.routes.map()` を使っているため、タブを追加するだけで自動対応

**検討した代替案**: ホーム画面ヘッダーのアイコンボタン → ユーザーがタブバー方式を選択

**必要な変更**:
- `apps/mobile/src/types/navigation.ts` の `MainTabParamList` に `SettingsTab: undefined` を追加
- `apps/mobile/src/app/MainTabs.tsx` に `SettingsTab` の `Tab.Screen` を追加
- `apps/mobile/src/features/home/screens/HomeScreen.tsx` の設定アイコンボタン（L374-381）を削除

---

## 2. DB スキーマ・マイグレーション調査

### 決定: `user_settings` テーブルをマイグレーション v8 で追加

**根拠**:
- 現在の最新バージョンは `LATEST_VERSION = 7`（`migrations.ts` L12）
- マイグレーションパターン: `PRAGMA table_info` で冪等チェック + `ALTER TABLE ADD COLUMN` のパターンが v4〜v7 で確立済み
- `user_settings` は新テーブルのため `CREATE TABLE IF NOT EXISTS` で冪等に実装

**スキーマ設計**:
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  weekly_goal_count    INTEGER NOT NULL DEFAULT 3,
  invite_code_unlocked INTEGER NOT NULL DEFAULT 0
);
-- 初期行の挿入（すでに存在する場合はスキップ）
INSERT OR IGNORE INTO user_settings (id, weekly_goal_count, invite_code_unlocked) VALUES (1, 3, 0);
```

**マイグレーション関数パターン**（既存の v5-v7 と同じスタイル）:
```typescript
async function migrateV7ToV8(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS user_settings (...)`);
  await db.execAsync(`INSERT OR IGNORE INTO user_settings (id, ...) VALUES (1, ...)`);
}
```

---

## 3. リポジトリパターン調査

### 決定: `UserSettingsRepository` を `repositories/userSettings.ts` として新規作成

**根拠**:
- 既存パターン: `export const XxxRepository = { ... }` のオブジェクト形式（`workout.ts`, `exercise.ts` など）
- `getDatabase()` を使って DB クライアントを取得
- 型は `database/types.ts` に追加

**`UserSettingsRepository` が提供するメソッド**:
- `get(): Promise<UserSettingsRow>` — 設定行を取得（存在しなければデフォルト値を返す）
- `setWeeklyGoalCount(count: number): Promise<void>` — 週の目標回数を更新（1〜7）
- `setInviteCodeUnlocked(unlocked: boolean): Promise<void>` — 招待コード解禁フラグを更新

---

## 4. WeeklyGoalsWidget の現状調査

### 決定: `targetWorkouts` prop を HomeScreen から DB 値で渡す

**現状**:
- `WeeklyGoalsWidget` には `targetWorkouts?: number` prop が定義済み（デフォルト値 3）
- `HomeScreen.tsx` は現在 `<WeeklyGoalsWidget />` を引数なしで呼んでいる → デフォルト3回で固定されている

**必要な変更**:
- `HomeScreen` で `UserSettingsRepository.get()` を呼び出し `weeklyGoalCount` を取得
- `<WeeklyGoalsWidget targetWorkouts={weeklyGoalCount} />` として渡す
- 設定変更後にホーム画面が再取得するよう `useFocusEffect` で再ロードする

---

## 5. 招待コードの環境変数調査

### 決定: `EXPO_PUBLIC_INVITE_CODE` を `.env.local` と `.env.example` に追加

**根拠**:
- 既存の `.env.local` には `EXPO_PUBLIC_USE_MOCK_AI`, `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_API_KEY` が存在
- `EXPO_PUBLIC_*` 形式はビルド時に Expo が `process.env.EXPO_PUBLIC_*` として注入する
- サーバー通信なしのオフライン検証であり、`.env.local` は `.gitignore` で秘匿済み

**検証ロジック**:
```typescript
const VALID_INVITE_CODE = process.env.EXPO_PUBLIC_INVITE_CODE ?? '';
export function validateInviteCode(input: string): boolean {
  return VALID_INVITE_CODE.length > 0 && input.trim() === VALID_INVITE_CODE;
}
```

---

## 6. テスト構造の調査

### 決定: 既存のテストパターンに準拠

**根拠**:
- `repositories/__tests__/` ディレクトリが存在。`initTestDatabase()` ヘルパーで SQLite インメモリ DB を使ったリポジトリテストが実装済み
- `screen.getByXxx()` スタイル（`testing-library/prefer-screen-queries` ルール準拠）
- モックは `jest.mock('@/database/client')` パターン

**テスト対象**:
1. `UserSettingsRepository` のユニットテスト（SQLite インメモリ）
2. `SettingsScreen` のコンポーネントテスト（`@testing-library/react-native`）
3. `HomeScreen` の統合テスト更新（`targetWorkouts` が反映されること）
