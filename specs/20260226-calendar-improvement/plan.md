# カレンダー動作改善 - 実装計画

## アーキテクチャ概要

変更は2つの独立したコンポーネントに閉じており、インターフェース変更なし。

```
CalendarScreen
  ├── [変更] onMonthChange を MonthCalendar に接続
  └── MonthCalendar（変更なし）
         └── onMonthChange コールバック（既に実装済み）

DaySummary
  └── [変更] fetchDayData() の DB クエリ最適化
```

## タスク順序

### T1: DaySummary クエリ最適化（先にテスト Red）

DaySummary のテストモックを更新してから実装するため、既存テストが先に壊れる（Red）。

1. `DaySummary.test.tsx` のモックデータを JOIN 形式に更新（Red→適用後に Green）
2. `DaySummary.tsx` のクエリを最適化（Green）

### T2: CalendarScreen の月変更自動選択（先にテスト Red）

1. `CalendarScreen.test.tsx` に月変更テストを追加（Red）
2. `CalendarScreen.tsx` に `handleMonthChange` を追加して接続（Green）

## データフロー（最適化後）

```
fetchDayData()
  → db.getAllAsync(workouts) → 1 row
  → db.getAllAsync(
      SELECT we.*, e.name as exercise_name
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
    ) → N rows (N = 種目数)
  → db.getAllAsync(
      SELECT * FROM sets
      WHERE workout_exercise_id IN (id1, id2, ...)
    ) → M rows (M = 全セット数)
  → Map<workout_exercise_id, sets[]> でグループ化して組み立て
```

## リスク・留意事項

1. **IN 句のプレースホルダー動的生成**: `workoutExerciseIds.map(() => '?').join(', ')` で生成
2. **0種目のワークアウト**: `workoutExerciseIds.length === 0` の場合は sets クエリをスキップ
3. **テストモック更新**: `mockGetFirstAsync` は不要になるが、宣言は残してよい
