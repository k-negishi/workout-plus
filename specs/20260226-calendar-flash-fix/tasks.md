# タスク一覧: カレンダー初期表示フラッシュ修正

## タスク

- [X] T1: テスト追加 - onLayout 前後の opacity 検証
  - ファイル: `MonthCalendar.component.test.tsx`
  - onLayout 前に opacity: 0 であることを検証
  - onLayout 後に opacity: 1 であることを検証

- [X] T2: MonthCalendar に isLayoutMeasured フラグを実装
  - ファイル: `MonthCalendar.tsx`
  - `isLayoutMeasured` state を追加
  - `handleLayout` で `setIsLayoutMeasured(true)` を呼ぶ
  - View の style に `opacity: isLayoutMeasured ? 1 : 0` を追加

- [X] T3: 既存テスト + 型チェック + Lint の通過確認
  - MonthCalendar テスト: 22/22 パス
  - CalendarScreen テスト: 17/17 パス
  - 型チェック: パス
  - Lint: エラーなし（既存 warning のみ）

## 合計: 3/3 タスク完了
