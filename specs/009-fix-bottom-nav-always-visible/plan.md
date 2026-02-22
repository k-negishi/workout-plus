# Implementation Plan: 下部ナビゲーションの常時固定表示

**Feature**: Issue #103 — どんな画面であっても、下メニューは必ず固定にする
**Branch**: `20260222-fix-bottom-nav-always-visible`

## 原因分析

`ExerciseHistoryFullScreen` が `RecordStack`（RootNavigator 直下）にしか登録されていないため、`HomeStack` / `CalendarStack` 内の `WorkoutDetailScreen` から種目名をタップすると:
- 実際には RecordStack コンテキストで遷移する
- RecordStack は MainTabs 外のため CustomTabBar が表示されない

## 修正方針

### 最小変更で修正（シンプル優先）

既にワーキングディレクトリに部分的な修正あり:
- ✅ `HomeStackParamList` に `ExerciseHistory` 追加済み（navigation.ts）
- ✅ `CalendarStackParamList` に `ExerciseHistory` 追加済み（navigation.ts）
- ✅ `HomeStack.tsx` に `ExerciseHistoryFullScreen` 追加済み
- ✅ `CalendarStack.tsx` に `ExerciseHistoryFullScreen` 追加済み

残り作業:
- ❌ `ExerciseHistoryFullScreen` が `RecordStackParamList` に依存した型のまま → 型修正が必要
- ❌ テスト未実装

## アーキテクチャ

```
RootNavigator (Stack)
├── MainTabs (BottomTab with CustomTabBar)
│   ├── HomeTab → HomeStack
│   │   ├── Home
│   │   ├── WorkoutDetail    ← ExerciseHistory に navigate できる
│   │   ├── WorkoutEdit
│   │   └── ExerciseHistory  ← ★新規追加（タブバーあり）
│   └── CalendarTab → CalendarStack
│       ├── Calendar
│       ├── WorkoutDetail    ← ExerciseHistory に navigate できる
│       └── ExerciseHistory  ← ★新規追加（タブバーあり）
└── RecordStack              ← 既存のまま（タブバーなし）
    ├── Record
    ├── ExercisePicker
    ├── ExerciseHistory      ← 既存のまま（RecordStack 文脈では必要）
    └── WorkoutSummary
```

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` | 修正 | navigation/route 型を汎用化 |
| `src/app/HomeStack.tsx` | 確認（既修正） | ExerciseHistory 追加 |
| `src/app/CalendarStack.tsx` | 確認（既修正） | ExerciseHistory 追加 |
| `src/types/navigation.ts` | 確認（既修正） | 両 ParamList に ExerciseHistory 追加 |
| `src/features/exercise/screens/__tests__/ExerciseHistoryFullScreen.test.tsx` | 新規 | 画面レンダリングと戻るボタンのテスト |

## 型設計の判断

`ExerciseHistoryFullScreen` は3つのスタックで使われるが、使用する navigation API は `goBack()` のみ。route params は3スタック共通で `{ exerciseId: string; exerciseName: string }` 。

```typescript
// Before（特定スタックに依存）
type RouteParams = RouteProp<RecordStackParamList, 'ExerciseHistory'>;
const navigation = useNavigation<NativeStackNavigationProp<RecordStackParamList>>();

// After（スタック非依存の汎用型）
type ExerciseHistoryParams = { exerciseId: string; exerciseName: string };
// useRoute は params を型安全に取得するため独自型を定義
// useNavigation は goBack() のみのため ParamListBase を使用
```

**選択理由**: `goBack()` のみ使用するコンポーネントに特定スタックの型を強制する必要はない。`ParamListBase` を使うことで3スタック全てに対して型安全性を保ちながら再利用できる。

## テスト戦略（TDD）

1. **Red**: `ExerciseHistoryFullScreen.test.tsx` を先に書く（描画・戻るボタン動作）
2. **Green**: 型修正を実施
3. **Refactor**: 不要な型依存を削除
