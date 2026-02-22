# Quickstart: カレンダー日付選択の反映不具合修正

## 1. 対象テストの Red を確認

```bash
pnpm --filter mobile test -- src/features/calendar/components/__tests__/MonthCalendar.test.tsx --runInBand
pnpm --filter mobile test -- src/features/calendar/screens/__tests__/CalendarScreen.test.tsx --runInBand
```

## 2. 実装修正（Green）

- `MonthCalendar.tsx` の日付押下判定を修正

## 3. 回帰確認

```bash
pnpm --filter mobile test -- src/features/calendar/components/__tests__/MonthCalendar.test.tsx --runInBand
pnpm --filter mobile test -- src/features/calendar/screens/__tests__/CalendarScreen.test.tsx --runInBand
pnpm --filter mobile lint
pnpm --filter mobile exec tsc --noEmit
```
