# Data Model: カレンダー日付選択の反映不具合修正

## Entity: SelectedDate

- 説明: カレンダー画面で現在選択中の日付（`yyyy-MM-dd`）
- 保持場所: `CalendarScreen` の React state
- 入力元: `MonthCalendar` の `onDayPress(dateString)`
- 出力先: `DaySummary` の `dateString` props

## Entity: PressedDay

- 説明: `react-native-calendars` が返す押下日情報
- 主フィールド:
  - `dateString`: 日付文字列（`yyyy-MM-dd`）
- バリデーション:
  - `dateString` が当日以前なら選択可能
  - `dateString` が未来日なら選択不可（state 更新なし）
