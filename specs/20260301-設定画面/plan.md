# Implementation Plan: 設定画面

**Branch**: `main` (当面 main で作業) | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/20260301-設定画面/spec.md`

---

## Summary

ワークアウトアプリにタブバー（5番目のタブ）経由でアクセスできる設定画面を実装する。主要機能は「週の目標ワークアウト回数の設定（1〜7回）」と「招待コードによる限定機能解禁」の2つ。設定値は SQLite `user_settings` テーブル（v8 マイグレーション）に永続化し、ホーム画面の進捗表示にリアルタイム反映する。招待コードはビルド時の `EXPO_PUBLIC_INVITE_CODE` 環境変数でオフライン検証する。

---

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**:
- `expo-sqlite ~15.2.0`（既存）
- `@expo/vector-icons` Ionicons（既存）
- `react-native-safe-area-context`（既存）
- `@react-navigation/bottom-tabs` v7（既存）

**Storage**: SQLite via expo-sqlite、`user_settings` テーブル（v8 migration）
**Testing**: Jest 29 + @testing-library/react-native（既存パターン準拠）
**Target Platform**: iOS 16+ / Android 10+（Expo Managed Workflow）
**Project Type**: モバイルアプリ（単一）
**Performance Goals**: 設定変更は 100ms 以内に UI 反映（SQLite はオフライン・同期）
**Constraints**: オフライン動作必須、サーバー通信なし、カバレッジ 90%+
**Scale/Scope**: 設定は 1 ユーザー・1 行のシンプル構造

---

## Constitution Check

| 原則 | 評価 | 根拠 |
|---|---|---|
| I. ローカルファースト | ✅ | SQLite に即座保存、オフライン動作、サーバー通信なし |
| II. 引き算のデザイン | ✅ | `[−] 回数 [+]` インラインステッパーで画面遷移ゼロ、グラデーション禁止 |
| III. MVPスコープ厳守 | ✅ | データ管理・アプリ設定セクションは「準備中」UI のみ、機能実装なし |
| IV. マネージドサービス専用 | ✅ | インフラ変更なし（オフライン完結） |
| V. 個人開発の持続可能性 | ✅ | 既存パターン（migrations, repository, screen）を踏襲 |
| VI. テスト・品質規律 | ✅ | TDD 必須、カバレッジ 90%+、ESLint strict |

**違反事項**: なし

---

## Project Structure

### Documentation (this feature)

```text
specs/20260301-設定画面/
├── plan.md              ← このファイル
├── research.md          ← Phase 0 出力
├── data-model.md        ← Phase 1 出力
├── quickstart.md        ← Phase 1 出力
├── settings-wireframe.html  ← UI デザイン参照
└── tasks.md             ← /speckit.tasks 出力（未生成）
```

### Source Code

```text
apps/mobile/src/
├── database/
│   ├── migrations.ts              # v8 追加: user_settings テーブル作成
│   ├── types.ts                   # UserSettingsRow, UserSettings 型追加
│   └── repositories/
│       ├── userSettings.ts        # 新規: UserSettingsRepository
│       └── __tests__/
│           └── userSettings.test.ts  # 新規: リポジトリテスト
├── types/
│   └── navigation.ts              # SettingsTab: undefined 追加
├── app/
│   └── MainTabs.tsx               # SettingsTab の Tab.Screen 追加
├── features/
│   ├── settings/
│   │   └── screens/
│   │       ├── SettingsScreen.tsx          # 新規: 設定画面本体
│   │       └── __tests__/
│   │           └── SettingsScreen.test.tsx  # 新規
│   └── home/
│       └── screens/
│           ├── HomeScreen.tsx              # 設定アイコン削除 + targetWorkouts 渡す
│           └── __tests__/
│               └── HomeScreen.test.tsx     # 更新: targetWorkouts テスト追加
└── .env.local / .env.example              # EXPO_PUBLIC_INVITE_CODE 追加
```

---

## 実装方針

### Task 1: DB マイグレーション v8（`user_settings` テーブル）

```typescript
// migrations.ts に追加
async function migrateV7ToV8(db: SQLiteDatabase): Promise<void> {
  // CREATE TABLE IF NOT EXISTS で冪等に実装
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id                   INTEGER PRIMARY KEY CHECK (id = 1),
      weekly_goal_count    INTEGER NOT NULL DEFAULT 3,
      invite_code_unlocked INTEGER NOT NULL DEFAULT 0
    )
  `);
  // デフォルト行を挿入（INSERT OR IGNORE で冪等）
  await db.execAsync(
    `INSERT OR IGNORE INTO user_settings (id, weekly_goal_count, invite_code_unlocked)
     VALUES (1, 3, 0)`
  );
}

// LATEST_VERSION を 8 に更新
// MIGRATIONS に 8: migrateV7ToV8 を追加
```

### Task 2: `UserSettingsRepository`

```typescript
// repositories/userSettings.ts
export const UserSettingsRepository = {
  async get(): Promise<UserSettings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserSettingsRow>('SELECT * FROM user_settings WHERE id = 1');
    if (row == null) {
      return { weeklyGoalCount: 3, inviteCodeUnlocked: false };
    }
    return {
      weeklyGoalCount: row.weekly_goal_count,
      inviteCodeUnlocked: row.invite_code_unlocked === 1,
    };
  },
  async setWeeklyGoalCount(count: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE user_settings SET weekly_goal_count = ? WHERE id = 1',
      [count],
    );
  },
  async setInviteCodeUnlocked(unlocked: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE user_settings SET invite_code_unlocked = ? WHERE id = 1',
      [unlocked ? 1 : 0],
    );
  },
};
```

### Task 3: `SettingsScreen`

**画面構成** (仕様 FR-002 より):
1. ヘッダー: 「設定」タイトル（戻るボタンなし、タブ画面）
2. セクション1 **ワークアウト**
   - 「週の目標」行 + `[−] N回 [+]` ステッパー
3. セクション2 **（タイトルなし）**
   - 「招待コード」行（未解禁: `›` / 解禁済み: `解禁済み` バッジ）
   - 未解禁時は入力フォームを展開
4. セクション3 **データ管理**
   - 「データインポート」`[準備中]` バッジ・非活性
   - 「データエクスポート」`[準備中]` バッジ・非活性
5. セクション4 **その他**
   - 「利用規約」`[準備中]` バッジ・非活性
   - 「プライバシーポリシー」`[準備中]` バッジ・非活性
   - 「バージョン」 `v1.0.0`（ `expo-constants` の `manifest.version`）

**招待コードの UI ロジック**:
- `isUnlocked === true` → 行に「解禁済み」バッジのみ表示（フォーム非表示）
- `isUnlocked === false` → `›` 行タップでフォーム展開（アコーディオン）
- フォーム: TextInput + 「適用」ボタン
  - 入力空 → ボタン非活性（FR-019）
  - 「適用」タップ → `validateInviteCode(input.trim())`
    - 有効 → `setInviteCodeUnlocked(true)` → フォーム下にインラインテキスト「✓ 限定機能が解禁されました」を表示し、解禁済みバッジに切り替え
    - 無効 → エラーテキスト「コードが正しくありません」

**週の目標ステッパー ロジック**:
- `[−]` : `count = 1` で `disabled`（FR-017）
- `[+]` : `count = 7` で `disabled`（FR-017）
- タップで `setWeeklyGoalCount(count ± 1)` を即実行（画面遷移なし）

### Task 4: ナビゲーション追加

```typescript
// types/navigation.ts
export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: NavigatorScreenParams<CalendarStackParamList>;
  StatsTab: undefined;
  AITab: undefined;
  SettingsTab: undefined; // 追加
};

// MainTabs.tsx に追加
<Tab.Screen
  name="SettingsTab"
  component={SettingsScreen}
  options={{
    tabBarLabel: '設定',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="settings-outline" size={size} color={color} />
    ),
  }}
/>
```

### Task 5: HomeScreen の更新

- `HomeScreen.tsx` L374-381 の設定アイコンボタンを削除（FR-020）
- `useFocusEffect` で `UserSettingsRepository.get()` を呼び出し
- `<WeeklyGoalsWidget targetWorkouts={weeklyGoalCount} />` を渡す

---

## 依存関係とタスク順序

```
Task 1 (migration v8)
  └─ Task 2 (UserSettingsRepository)
       ├─ Task 3 (SettingsScreen) ── Task 4 (Navigation) と並列可能
       └─ Task 5 (HomeScreen 更新)
```

**並列可能**:
- Task 3 と Task 4 は Task 2 完了後に並列実行可能
- Task 5 は Task 2 完了後に独立して実行可能

---

## リスクと対策

| リスク | 対策 |
|---|---|
| `LATEST_VERSION` の更新忘れ | TDD で migration テストを先に書く |
| `INSERT OR IGNORE` で初期行が入らない | テストでリポジトリ `get()` の戻り値を検証 |
| `useFocusEffect` で HomeScreen が再レンダリングしすぎる | `useRef(false)` は不要（毎回最新値取得が正しい挙動） |
| `EXPO_PUBLIC_INVITE_CODE` 未設定でのクラッシュ | `?? ''` でデフォルト空文字、空文字の場合は「適用」ボタン非活性 |
| ESLint `sonarjs/cognitive-complexity` 超過 | 入力フォームを別コンポーネントに切り出す |

---

## Complexity Tracking

> Constitution Check の違反なし。Complexity Tracking への記載は不要。
