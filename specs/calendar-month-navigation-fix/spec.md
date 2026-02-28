# カレンダー月ナビゲーション不具合修正 (Issue #196)

## 概要

CalendarScreen の MonthCalendar コンポーネントに2つのバグが存在する。

## バグ詳細

### Bug 1: `<>` ボタンで2ヶ月飛ぶことがある

**症状**: `<` または `>` ボタンを押すと、1ヶ月ではなく2ヶ月分移動することがある。

**根本原因**:
- 矢印ボタン → `scrollTo({ x: 0, animated: true })` でアニメーション開始
- `isAnimatingRef.current = true` で `handleMomentumScrollEnd` をガード
- 300ms 後: `setDisplayMonth` + `resetToCenter()` → `isAnimatingRef.current = false`
- iOS の animated スクロールのモメンタムが 300ms 以降に遅れて `onMomentumScrollEnd` を発火
- この時点で `isAnimatingRef.current === false` なのでガードを通り抜け、さらに1ヶ月変更される

### Bug 2: 前後月の日付タップで月遷移しない

**症状**: 2月表示中に前月パネルの 1/28 をタップしても表示が1月に切り替わらない。

**根本原因**:
- `handleDayPress` は `setSelectedDate(dateString)` を呼ぶが `setDisplayMonth` を変更しない
- 前月・翌月のオーバーフロー日付をタップしても表示月が変わらない

## 修正方針

### Bug 1 修正: ユーザードラッグと矢印ボタンを分離

`onScrollBeginDrag` でユーザーのスワイプ開始を追跡するフラグ `isUserDraggingRef` を追加する。
`onMomentumScrollEnd` は `isUserDraggingRef === true` の場合のみ月変更処理を行う。
矢印ボタンによる `scrollTo` のモメンタムには `isUserDraggingRef` が立たないため、遅延発火しても安全に無視できる。

### Bug 2 修正: 前後月日付タップ時に displayMonth を自動切り替え

`handleDayPress` で、タップした日付の月が `displayMonth` と異なる場合に `setDisplayMonth` と `setMonthChangeKey` を更新する。
`onMonthChange` は呼ばない（`onDayPress` が既に選択日をセットするため、上書きを防ぐ）。

## ユーザーストーリー

- US-1: ユーザーが `<` ボタンを押すと、常に1ヶ月前に移動する（2ヶ月飛びが発生しない）
- US-2: ユーザーが `>` ボタンを押すと、常に1ヶ月後に移動する（2ヶ月飛びが発生しない）
- US-3: ユーザーが前月のオーバーフロー日付（例: 1/28）をタップすると、自動的に前月に切り替わる
- US-4: ユーザーが翌月のオーバーフロー日付をタップすると、自動的に翌月に切り替わる（翌月移動可能な場合のみ）

## 受け入れ条件

- [ ] 矢印ボタンを連続で素早くタップしても2ヶ月飛ばない
- [ ] スワイプ月変更は引き続き正常に動作する
- [ ] 前月オーバーフロー日付タップ時に月が前月に切り替わる
- [ ] 翌月オーバーフロー日付タップ時に月が翌月に切り替わる（当月表示中は不可）
- [ ] 日付タップ後の selectedDate が `onMonthChange` で上書きされない
- [ ] 既存テストがすべてパスする
