# タスクリスト: カレンダー月ナビゲーション不具合修正

## T1: Bug 1 のテストを追加（Red）

**対象**: `MonthCalendar.component.test.tsx`

矢印ボタン押下後に `isAnimatingRef` が false になった後で `onMomentumScrollEnd` が遅れて発火した場合でも月変更が1回しか起きないことを検証する新テストを追加する。

```
describe('矢印ボタン後の遅延 onMomentumScrollEnd を無視する')
- タイマーを全消化後に onMomentumScrollEnd を発火させても月が追加変更されないこと
```

**依存**: なし

## T2: Bug 2 のテストを追加（Red）

**対象**: `MonthCalendar.component.test.tsx`

前月・翌月オーバーフロー日付タップ時に `displayMonth` が切り替わることを検証する新テストを追加する。

```
describe('前後月日付タップで displayMonth が自動切り替えされる')
- 前月パネルの Calendar.onDayPress で前月の日付をタップ → 表示月が前月に変わること
- 翌月パネルの Calendar.onDayPress で翌月の日付をタップ → 表示月が翌月に変わること（前月に移動済みの場合）
- selectedDate は onDayPress で渡した dateString のまま（onMonthChange の上書きなし）
```

**依存**: なし

## T3: Bug 1 を修正（Green）

**対象**: `MonthCalendar.tsx`

1. `isUserDraggingRef = useRef(false)` を追加
2. `handleScrollBeginDrag` コールバックを追加（`isUserDraggingRef.current = true`）
3. `handleMomentumScrollEnd` 冒頭に `if (!isUserDraggingRef.current) return;` と `isUserDraggingRef.current = false;` を追加
4. ScrollView に `onScrollBeginDrag={handleScrollBeginDrag}` を追加

**依存**: T1

## T4: Bug 2 を修正（Green）

**対象**: `MonthCalendar.tsx`

`handleDayPress` 内で、タップした日付月が `displayMonth` と異なる場合に:
- `setDisplayMonth(tappedMonth)` を呼ぶ
- `setMonthChangeKey(prev => prev + 1)` を呼ぶ
- `onMonthChange` は呼ばない（selectedDate 上書き防止）

**依存**: T2

## T5: Lint・型チェック・テスト実行

```bash
pnpm --filter mobile test -- MonthCalendar
pnpm --filter mobile tsc --noEmit
pnpm lint
```

**依存**: T3, T4
