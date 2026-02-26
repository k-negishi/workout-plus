# カレンダー動作改善 - 仕様書

## 機能概要

Issue #167 で報告された2つのカレンダー UX 課題を解決する。

1. **月変更時の1日自動選択**: 月を切り替えた際、その月の1日が自動的に選択される
2. **DaySummary パフォーマンス改善**: 日付タップ時のサマリ表示遅延を解消するため、N+1 クエリを最適化する

## ユーザーストーリー

### US-1: 月変更時の自動日付選択

> カレンダーで月を切り替えたとき、その月の1日が自動的に選択された状態になる

**受け入れ条件**:
- 前月ボタン押下後、アニメーション完了時に前月の1日が選択される
- 翌月ボタン押下後、アニメーション完了時に翌月の1日が選択される
- スワイプで月変更した後も、新しい月の1日が選択される
- 月変更時は DaySummary が1日のデータで再ロードされる

### US-2: DaySummary パフォーマンス改善

> 日付をタップしたとき、サマリが素早く表示される

**受け入れ条件**:
- DB クエリが種目数に依存しない（固定3クエリ）
- ワークアウト・種目・セットのデータが正しく表示される
- 種目名タップによる ExerciseHistory 遷移が引き続き動作する

## 技術仕様

### US-1 実装詳細

**CalendarScreen.tsx**:
- `handleMonthChange(dateString: string)` コールバックを追加
  - `dateString` は各月の1日（`format(startOfMonth(newMonth), 'yyyy-MM-dd')`形式）
  - `setSelectedDate(dateString)` を呼ぶ
  - `setCurrentWorkoutId(null)` と `setDaySummaryLoaded(false)` もリセット
- `MonthCalendar` の `onMonthChange` に `handleMonthChange` を渡す

### US-2 実装詳細

**DaySummary.tsx** の `fetchDayData()` を最適化:

現状（N+1クエリ）:
1. `workouts` クエリ: 1回
2. `workout_exercises` クエリ: 1回
3. `exercises` クエリ（`getFirstAsync`）: 種目数N回
4. `sets` クエリ: 種目数N回

最適化後（3クエリ固定）:
1. `workouts` クエリ: 変更なし
2. `workout_exercises JOIN exercises` クエリ: 種目名を JOIN で一括取得
3. `sets WHERE workout_exercise_id IN (...)` クエリ: 全セットを一括取得

## テスト要件

### US-1 テスト

- `CalendarScreen.test.tsx` に追加:
  - 月変更時に `onDayPress` が1日付きで呼ばれることを検証

### US-2 テスト

- `DaySummary.test.tsx` の既存テストが新しいクエリパターンで通ること
- `setupMockWithWorkout` ヘルパーのモックデータを JOIN レスポンス形式に更新

## 影響範囲

| ファイル | 変更種別 |
|---|---|
| `CalendarScreen.tsx` | 機能追加（onMonthChange 接続） |
| `DaySummary.tsx` | パフォーマンス改善（クエリ最適化） |
| `CalendarScreen.test.tsx` | テスト追加 |
| `DaySummary.test.tsx` | テスト更新（モックデータ形式変更） |
