# Research: カレンダー日付選択の反映不具合修正

## Decision 1: 未来日判定は「明示的な未来判定」を使う

- 決定: `!isBefore(...)` の否定ロジックではなく、「今日より後なら無効」という正方向の判定に置き換える
- 根拠: 現行の条件式は意味が逆転しており、当日以前が無効・未来日が有効になるバグを誘発しているため
- 検討した代替案:
  - `Calendar` の `maxDate` に依存してコールバック側判定を削除する
  - `date-fns/isAfter` を使わずエポック比較のみで判定する

## Decision 2: 回帰防止のため UI 統合観点とコンポーネント単体観点の両方でテストする

- 決定: `MonthCalendar` テストに日付押下判定テストを追加し、`CalendarScreen` テストで `DaySummary` 連携を検証する
- 根拠: 条件式単体だけでなく、画面の状態伝播（selectedDate -> DaySummary）を保証するため
- 検討した代替案:
  - `CalendarScreen` のみ検証する
  - `MonthCalendar` のみ検証する
