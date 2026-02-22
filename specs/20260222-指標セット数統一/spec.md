# 仕様書: 指標表示統一 - セット数ベースへの移行

## 概要

アプリ全体で「総負荷量（kg）」「最長ストリーク」「総トレ回数」「最終PR」などの指標を、
セット数・推定1RM ベースへ統一する。ユーザーはトレーニング量をセット数で管理したい。

## 関連 Issue

- #110: ホームの今週の目標を総負荷量 → 総セット数に
- #111: ホームダッシュボードの最長ストリーク → 総セット数に（月間ボリュームの左）
- #112: ワークアウト詳細の総ボリューム → 総種目数に
- #113: 種目詳細の総トレ回数 → 総セット数に
- #114: 種目詳細の最終PR → 最高RM（推定1RM最高値）に
- #115: カレンダー画面の総ボリュームを一番右に

## ユーザーストーリー

1. **US-01**: ホーム画面の「今週の目標」で今週の総セット数を確認できる
2. **US-02**: ホームダッシュボードで月間総セット数を確認できる（月間ボリュームの左）
3. **US-03**: ワークアウト詳細の概要カードで種目数を確認できる
4. **US-04**: 種目詳細画面で当該種目の通算総セット数を確認できる
5. **US-05**: 種目詳細画面で全期間の最高推定1RMを確認できる
6. **US-06**: カレンダー日次サマリーで総ボリュームが右端に表示される

## 変更仕様

### US-01: WeeklyGoalsWidget (#110)

**ファイル**: `apps/mobile/src/features/home/components/WeeklyGoalsWidget.tsx`

- `thisWeekVolume: number` → `thisWeekSets: number`（prop 変更）
- セル2 ラベル: 「総負荷量」→「総セット数」
- セル2 表示値: `(thisWeekVolume / 1000).toFixed(1)t` → `thisWeekSets` + 単位「セット」

**HomeScreen 対応**:
- `weeklyVolume` の代わりに `weeklySetCount` を計算（workoutSummaries の setCount 合算）
- `WeeklyGoalsWidget` の prop 変更

### US-02: QuickStatsWidget (#111)

**ファイル**: `apps/mobile/src/features/home/components/QuickStatsWidget.tsx`

- `longestStreak: number` prop → `monthlySetCount: number` prop
- 2行目の配置: [月間ボリューム, 最長ストリーク] → [総セット数, 月間ボリューム]
  - 左: 総セット数（`monthlySetCount`）+ 単位「セット」
  - 右: 月間ボリューム（既存）

**HomeScreen 対応**:
- `longestStreak` の代わりに `monthlySetCount` を計算（workoutSummaries の setCount 月間合算）
- `QuickStatsWidget` の prop 変更

### US-03: WorkoutDetailScreen (#112)

**ファイル**: `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx`

- 概要カード中央セル: 「総ボリューム」(`totalVolume`) → 「総種目数」(`exerciseBlocks.length`)
- 「総ボリューム」の計算・使用は削除

### US-04 & US-05: useExerciseHistory + ExerciseHistoryFullScreen (#113, #114)

**ファイル**:
- `apps/mobile/src/features/exercise/hooks/useExerciseHistory.ts`
- `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx`

`ExerciseStats` に追加:
- `totalSets: number` — 全セット数（全ワークアウト合算）
- `maxEstimated1RM: number` — Epley式での最高推定1RM

`calculateStats` 追加ロジック:
- `totalSets` = sets.length（weight/reps の null を問わずカウント）
- `maxEstimated1RM` = max( weight × (1 + reps / 30) ) ただし weight/reps が null のセットは除外

StatCard 変更:
- 「総トレ回数」`stats.totalSessions` → 「総セット数」`stats.totalSets` 単位「セット」
- 「最終PR」`stats.lastPRDate` → 「最高RM」`stats.maxEstimated1RM` 単位「kg」

### US-06: DaySummary (#115)

**ファイル**: `apps/mobile/src/features/calendar/components/DaySummary.tsx`

- 概要カード順序変更: [所要時間, 総ボリューム, 種目数, セット数] → [所要時間, 種目数, セット数, 総ボリューム]

## 非機能要件

- テストカバレッジ: 変更箇所の単体テストを必ず更新・追加
- 型安全: TypeScript strict モードでエラーなし
- 後方互換: DB スキーマ変更なし
