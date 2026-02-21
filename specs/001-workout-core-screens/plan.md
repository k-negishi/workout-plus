# Implementation Plan: ワークアウト記録コア画面

**Branch**: `feature/001-workout-core-screens` | **Date**: 2026-02-21 | **Spec**: `specs/001-workout-core-screens/spec.md`

---

## Summary

ワイヤーフレーム（v5 MD3）に基づくMVPコア画面9画面の実装。React Native (TypeScript) + Expo managed workflow で、ローカルファーストのワークアウト記録アプリを構築する。expo-sqlite でローカルDB、Zustand で状態管理、React Navigation 7 でナビゲーション。

**入力ドキュメント**:
- 仕様書: `specs/001-workout-core-screens/spec.md`
- コンスティテューション: `.specify/memory/constitution.md`
- ワイヤーフレーム: `requirements/adopted/workout_plus_wireframes_v5_md3.html`
- 企画書: `requirements/workout_plus_plan_v3.md`

---

## Technical Context

| 項目 | 値 |
|------|-----|
| Language/Version | TypeScript 5.x (strict mode) |
| Primary Dependencies | React Native 0.76+, Expo SDK 52+, React Navigation 7, Zustand 5, expo-sqlite |
| Storage | SQLite (expo-sqlite) — ローカルファースト |
| Testing | Jest + React Native Testing Library (カバレッジ 90%) |
| Target Platform | iOS 16+ / Android 10+ (Expo managed workflow) |
| Project Type | Mobile (monorepo: apps/mobile/) |
| Performance Goals | 60fps、画面遷移 <300ms、セット入力→保存 <100ms |
| Constraints | オフライン完全動作、バンドル <50MB |
| Scale/Scope | 9画面、5エンティティ、41機能要件 |

---

## Constitution Check (v1.1.1, 6原則)

| 原則 | 適合 | 根拠 |
|------|:----:|------|
| I. ローカルファースト | ✅ | expo-sqlite でローカル完結。サーバー通信なし |
| II. 引き算のデザイン | ✅ | ワイヤーフレーム v5 MD3 準拠。カラートークン定義済み |
| III. MVPスコープ厳守 | ✅ | スマホアプリ単独。サーバー/認証/課金は対象外 |
| IV. マネージドサービス専用 | N/A | MVP はサーバーサイドなし。Phase 2 以降で適用 |
| V. 個人開発の持続可能性 | ✅ | pnpm + Turborepo モノレポ。CI path filter |
| VI. テスト・品質規律 | ✅ | Jest 90%、ESLint strict-type-checked、Prettier、husky |

**違反なし** → Complexity Tracking 不要

---

## Library Decisions

| カテゴリ | 採用 | 不採用 | 根拠 |
|---------|------|--------|------|
| UIスタイリング | NativeWind v4 | Gluestack UI, Tamagui | Tailwindクラスで素早くレイアウト。引き算デザイン原則に合う |
| チャート | react-native-gifted-charts | Victory Native XL | Reanimated ベース。Skia不要で軽量 |
| カレンダー | react-native-calendars | react-native-big-calendar | ドットマーカー対応。月表示に適切 |
| アニメーション | react-native-reanimated v3 | Animated API | SDK 52 バンドル済み。ボトムシートに必須 |
| ボトムシート | @gorhom/bottom-sheet | react-native-raw-bottom-sheet | Reanimated v3 対応。70%→フルスクリーン展開が容易 |
| Toast | burnt | react-native-toast-message | ネイティブ実装。Expo managed 対応 |
| 日付操作 | date-fns v4 | dayjs, Temporal API | Tree-shaking 対応。ローカル用途で十分 |
| ID生成 | ulid | uuid v7 | 時刻順ソート可能。Node.js crypto 依存なし |
| フォーム | useState + カスタムhook | React Hook Form | 2フィールドのセット入力に RHF は過剰 |
| アイコン | @expo/vector-icons | react-native-vector-icons | Expo バンドル済み。追加設定不要 |

---

## Quality Tooling

### ESLint (flat config: eslint.config.mjs)

| プラグイン | 目的 |
|-----------|------|
| @typescript-eslint/strict-type-checked | any禁止・バグパターン一括 |
| @typescript-eslint/stylistic-type-checked | 文体統一 |
| eslint-plugin-react + react-hooks | React/hooks ルール |
| eslint-plugin-react-native | RN固有ルール |
| eslint-plugin-simple-import-sort | import並び順 |
| eslint-plugin-sonarjs | バグパターン検出 |
| eslint-plugin-unicorn (選択的) | モダンJS強制 |
| eslint-plugin-jest | テストルール |
| eslint-plugin-testing-library | RNTL ベストプラクティス |

**重要ルール**:
- `@typescript-eslint/no-explicit-any: error` — any 完全禁止
- `@typescript-eslint/no-unsafe-*: error` (6種) — unsafe 操作禁止
- `complexity: ['error', 10]` — 循環的複雑度 ≤10
- `no-console: error` — console.log 禁止
- `@typescript-eslint/naming-convention` — 命名規則強制

### tsconfig strict 追加オプション

```json
{
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "noPropertyAccessFromIndexSignature": true
}
```

### Prettier (.prettierrc)

```json
{ "printWidth": 100, "singleQuote": true, "trailingComma": "all", "semi": true }
```

### Git Hooks

- husky + lint-staged（コミット前: lint + format 強制）
- commitlint + @commitlint/config-conventional（コミットメッセージ規約）

---

## Project Structure

### Documentation (this feature)

```text
specs/001-workout-core-screens/
├── plan.md         # 本ファイル
├── research.md     # 技術選定リサーチ
├── data-model.md   # SQLiteスキーマ + エンティティ設計
├── quickstart.md   # 環境構築・テスト実行手順
└── tasks.md        # (/speckit.tasks で生成)
```

### Source Code (monorepo)

```text
workout-plus/
├── apps/mobile/
│   ├── app.json, babel.config.js, tsconfig.json
│   ├── jest.config.ts, eslint.config.mjs, .prettierrc
│   ├── App.tsx
│   └── src/
│       ├── app/                          # ナビゲーション
│       │   ├── RootNavigator.tsx
│       │   ├── MainTabs.tsx
│       │   ├── HomeStack.tsx
│       │   ├── CalendarStack.tsx
│       │   └── RecordStack.tsx
│       ├── features/
│       │   ├── workout/                  # 記録・閲覧・編集・サマリー
│       │   │   ├── screens/             (RecordScreen, Detail, Edit, Summary)
│       │   │   ├── components/          (SetRow, ExerciseBlock, TimerBar, FloatingBar)
│       │   │   ├── hooks/               (useWorkoutSession, useTimer, usePreviousRecord)
│       │   │   └── utils/               (calculate1RM, calculateVolume)
│       │   ├── exercise/                 # 種目選択・履歴
│       │   │   ├── screens/             (PickerScreen, HistoryFullScreen)
│       │   │   ├── components/          (ListItem, CategoryTabs, SearchBar, CustomForm)
│       │   │   └── hooks/               (useExerciseSearch, useExerciseHistory)
│       │   ├── home/                     # ホーム
│       │   │   ├── screens/             (HomeScreen)
│       │   │   └── components/          (StreakCard, WeeklyCalendar, RecentCard, QuickStats)
│       │   └── calendar/                 # カレンダー
│       │       ├── screens/             (CalendarScreen)
│       │       └── components/          (MonthCalendar, DaySummary)
│       ├── shared/
│       │   ├── components/              (Button, Card, Toast, ConfirmDialog, EmptyState, NumericInput)
│       │   ├── hooks/                   (useAppState, useToast)
│       │   └── constants/               (colors, spacing, typography, muscleGroups)
│       ├── stores/                       # Zustand
│       │   ├── workoutSessionStore.ts
│       │   ├── exerciseStore.ts
│       │   └── uiStore.ts
│       ├── database/                     # SQLite層
│       │   ├── client.ts, schema.ts, migrations.ts, seed.ts
│       │   ├── repositories/            (workout, exercise, set, pr)
│       │   └── types.ts
│       └── types/                        (workout, exercise, pr, navigation)
├── packages/shared/                      # 将来のAPI型共有用（MVP はほぼ空）
├── pnpm-workspace.yaml, turbo.json
├── .husky/pre-commit
└── .github/workflows/ci.yml
```

**構成方針**: feature-based。テストは colocation（同一ディレクトリに `.test.tsx`）。

---

## ナビゲーション構造

```text
RootNavigator (Stack - modal mode)
├── MainTabsWithFloatingBar
│   ├── HomeTab (Stack)
│   │   ├── HomeScreen
│   │   ├── WorkoutDetailScreen
│   │   └── WorkoutEditScreen
│   ├── CalendarTab (Stack)
│   │   ├── CalendarScreen
│   │   ├── WorkoutDetailScreen
│   │   └── WorkoutEditScreen
│   ├── [+] RecordButton (custom tabBarButton → navigate to RecordStack)
│   └── StatsTab (placeholder, disabled)
├── RecordStack (Stack - fullScreenModal)
│   ├── RecordScreen
│   ├── ExercisePickerScreen (modal)
│   ├── ExerciseHistoryFullScreen
│   └── WorkoutSummaryScreen
└── DiscardDialog (transparentModal)
```

- [+]ボタン: custom tabBarButton → RecordStack にナビゲート
- RecordStack: Root 直下のモーダル（タブバー非表示のフルスクリーン）
- DiscardDialog: transparentModal で記録画面・編集画面両方から呼び出し可能
- WorkoutDetail/Edit: HomeTab・CalendarTab 両 Stack 内に定義 → スタックベースナビゲーション実現
- 種目選択結果: Zustand ストア経由で渡す（navigation params ではなく）
- FloatingRecordBar: MainTabs をラップするカスタムコンポーネント。recording 中のみ表示

---

## データフロー

```text
UI (Screen → Hook) → Zustand Store ↔ Repository → SQLite (Source of Truth)
```

- 書き込み: Hook → Repository (SQLite 保存) → Store 楽観的更新 → UI 反映
- 読み取り: Hook → Store subscribe ← invalidation counter ← Repository
- タイマー: setInterval + AppState listener → Store.setState()（コンポーネント外操作）
- リアクティブ補完: Zustand invalidation pattern（expo-sqlite にリアクティブクエリがないため）

---

## 実装フェーズ（ユーザーストーリー優先度順）

| Phase | 内容 | 依存 |
|-------|------|------|
| 0 | プロジェクト初期化（Expo, TS, ESLint, Jest, husky, CI） | なし |
| 1 | データ層（SQLite スキーマ, Repository, Zustand ストア） | Phase 0 |
| 2 | ナビゲーション + 共通 UI コンポーネント | Phase 0 |
| 3 | P1: 記録フロー（Record, Picker, Summary） | Phase 1, 2 |
| 4 | P2: 閲覧・編集 + 種目管理（Detail, Edit, Discard） | Phase 1, 2 |
| 5 | P3: カレンダー + ホーム + 種目履歴 | Phase 1, 2 |
| 6 | 仕上げ（エッジケース, 空状態, エラートースト, カバレッジ補完） | Phase 3-5 |

### Phase 0: プロジェクト初期化

- `npx create-expo-app` → TypeScript 設定
- ESLint flat config (`eslint.config.mjs`) — strict-type-checked + 上記プラグイン群
- Prettier (`.prettierrc`) + husky + lint-staged + commitlint
- tsconfig 追加オプション（noUncheckedIndexedAccess 等）
- pnpm-workspace.yaml + turbo.json
- Jest + RNTL 設定（カバレッジ閾値 90%）
- GitHub Actions CI（lint, format check, test, coverage）
- ディレクトリ雛形作成

### Phase 1: データ層

- SQLite スキーマ・マイグレーション基盤
- プリセット種目シード（部位ごとに 5-10 種目）
- Repository 実装 4つ + ユニットテスト
- Zustand ストア 3つ + ユニットテスト

### Phase 2: ナビゲーション + 共通コンポーネント

- React Navigation セットアップ（Tab + Stack + Modal）
- 共通 UI コンポーネント（Button, Card, NumericInput, Toast, ConfirmDialog, EmptyState）
- デザイントークン（colors, spacing, typography）
- コンポーネントテスト

### Phase 3: P1 — ワークアウト記録（US-1）

- RecordScreen（タイマーバー、種目ブロック、セット入力、前回記録コピー）
- ExercisePickerScreen（検索、カテゴリ、お気に入り、複数選択、カスタム種目）
- WorkoutSummaryScreen（統計、PR ハイライト、ストリーク）
- useTimer フック（バックグラウンド復帰対応）
- 統合テスト: recordWorkoutFlow
- **ワイヤーフレーム参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html`

### Phase 4: P2 — 閲覧・編集（US-2, US-5, US-6）

- WorkoutDetailScreen, WorkoutEditScreen
- DiscardDialog
- セット追加/削除、種目追加/削除
- カスタム種目の編集
- FloatingRecordBar
- 統合テスト: editWorkoutFlow

### Phase 5: P3 — カレンダー + ホーム + 種目履歴（US-3, US-4, US-7）

- CalendarScreen（月表示、ドットマーカー、日付タップ→サマリー）
- HomeScreen（ストリーク、週間カレンダー、最近3件、クイック統計）
- ExerciseHistoryFullScreen（統計、チャート、PR 履歴、全履歴）

### Phase 6: 仕上げ

- 全エッジケース対応（spec.md Edge Cases セクション）
- 空状態メッセージ
- エラートースト
- カバレッジ 90% 確認・テスト補完
- FlatList パフォーマンス最適化

---

## Verification

実装完了後の検証手順:

1. **Lint/Format**: `pnpm --filter mobile lint` エラーゼロ、`pnpm --filter mobile format:check` 差分ゼロ
2. **テスト**: `pnpm --filter mobile test --coverage` 全パス、カバレッジ 90%+
3. **E2E フロー**: Expo Go で以下を手動検証
   - 「+」→ 種目追加 → セット入力 → 完了 → サマリー → ホームに反映
   - ホーム → 詳細 → 編集 → 保存/破棄
   - カレンダー → 日付タップ → サマリー → 詳細
   - バックグラウンド → 復帰 → タイマー正確
4. **Constitution 適合**: 原則 I-VI すべて違反なし
