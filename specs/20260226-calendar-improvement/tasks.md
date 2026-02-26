# カレンダー動作改善 - タスク一覧

## T1: DaySummary テスト更新（モックデータを JOIN 形式に）

- [X] `DaySummary.test.tsx` の全 `setupMockWithWorkout` ヘルパーで:
  - `FROM workout_exercises` に `exercise_name` フィールドを追加
  - `mockGetFirstAsync` の呼び出しを削除（不要になる）
- 並列: T2 と独立して実行可能

## T2: DaySummary クエリ最適化

- [X] `DaySummary.tsx` の `fetchDayData()` を変更:
  - `workout_exercises JOIN exercises` で種目名を一括取得
  - `sets WHERE workout_exercise_id IN (...)` で全セット一括取得
  - グループ化ロジックを実装
  - `ExerciseRow` の import 削除
- 依存: T1 完了後にテスト実行して Green 確認 → ✅ 13/13 PASS

## T3: CalendarScreen テスト追加

- [X] `CalendarScreen.test.tsx` に追加:
  - 月変更時に `onMonthChange` が呼ばれ `selectedDate` が1日になるテスト
- 並列: T1/T2 と独立して実行可能

## T4: CalendarScreen の月変更自動選択

- [X] `CalendarScreen.tsx` に変更:
  - `handleMonthChange` コールバックを追加
  - `MonthCalendar` の `onMonthChange` prop に接続
- 依存: T3 完了後にテスト実行して Green 確認 → ✅ 17/17 PASS

## T5: テスト全通し・Lint・型チェック

- [X] カレンダー関連テスト: 61/61 PASS
- [X] `tsc --noEmit`: 0 errors
- [X] Lint: 0 errors（warnings のみ・既存）
