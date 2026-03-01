# Quickstart: 設定画面

**Feature**: 20260301-設定画面
**Date**: 2026-03-01

---

## 実装の全体像

```
user_settings テーブル（SQLite v8 migration）
      ↓
UserSettingsRepository（CRUD）
      ↓
useUserSettings（Zustand or useFocusEffect + useState）
      ├── SettingsScreen（設定画面 UI）
      └── HomeScreen（週の目標を WeeklyGoalsWidget へ渡す）
```

---

## 変更ファイル一覧

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `database/migrations.ts` | 変更 | v8 マイグレーション追加（`user_settings` テーブル作成） |
| `database/types.ts` | 変更 | `UserSettingsRow`, `UserSettings` 型追加 |
| `database/repositories/userSettings.ts` | 新規 | `UserSettingsRepository` |
| `database/repositories/__tests__/userSettings.test.ts` | 新規 | リポジトリテスト |
| `types/navigation.ts` | 変更 | `MainTabParamList` に `SettingsTab: undefined` 追加 |
| `app/MainTabs.tsx` | 変更 | `SettingsTab` の `Tab.Screen` 追加 |
| `features/settings/screens/SettingsScreen.tsx` | 新規 | 設定画面本体 |
| `features/settings/screens/__tests__/SettingsScreen.test.tsx` | 新規 | 設定画面テスト |
| `features/home/screens/HomeScreen.tsx` | 変更 | 設定アイコン削除・`targetWorkouts` prop 追加 |
| `features/home/screens/__tests__/HomeScreen.test.tsx` | 変更 | `targetWorkouts` 対応テスト追加 |
| `.env.local` | 変更 | `EXPO_PUBLIC_INVITE_CODE=<code>` 追加 |
| `.env.example` | 変更 | `EXPO_PUBLIC_INVITE_CODE=` 追加 |

---

## ディレクトリ構成（追加分）

```
apps/mobile/src/
├── database/
│   ├── migrations.ts           # v8 追加
│   ├── types.ts                # UserSettingsRow, UserSettings 追加
│   └── repositories/
│       ├── userSettings.ts     # 新規
│       └── __tests__/
│           └── userSettings.test.ts  # 新規
├── features/
│   └── settings/
│       └── screens/
│           ├── SettingsScreen.tsx    # 新規
│           └── __tests__/
│               └── SettingsScreen.test.tsx  # 新規
└── types/
    └── navigation.ts           # SettingsTab 追加
```

---

## 招待コードの開発環境設定

```bash
# .env.local に追加
EXPO_PUBLIC_INVITE_CODE=workout-beta-2026
```

> ⚠️ `.env.local` は `.gitignore` で秘匿済み。本番用コードはビルド時に CI シークレットから注入する。

---

## 週の目標と今週達成件数の取得

```typescript
// 今週（月曜起点）の開始日時を取得
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=日, 1=月, ..., 6=土
  const diff = day === 0 ? -6 : 1 - day; // 月曜にずらす
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
```

---

## テスト実行

```bash
# モバイルアプリのテスト（全体）
pnpm --filter mobile test

# カバレッジ付き（目標 90%+）
pnpm --filter mobile test --coverage

# 型チェック
pnpm --filter mobile tsc --noEmit

# Lint
pnpm lint
```

---

## 動作確認（手動）

1. アプリ起動 → タブバー右端に「設定」歯車アイコンが表示される
2. 設定タブをタップ → 設定画面が表示される（戻るボタンなし）
3. `[+]` を 2 回タップ → 「5回」に変化
4. ホームタブに戻る → 進捗が「X / 5回」に更新されている
5. アプリ再起動 → 設定画面を開くと「5回」が維持されている
6. 招待コードフィールドをタップ → コード入力 UI が開く
7. 有効なコードを入力して「適用」 → 「解禁されました」と表示
8. アプリ再起動 → 招待コード行に「解禁済み」バッジが表示される
