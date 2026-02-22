# Tasks: カレンダー日付選択の反映不具合修正

**Input**: `specs/008-calendar-date-selection-fix/`  
**Prerequisites**: spec.md, plan.md, research.md, data-model.md

## Phase 1: Setup

- [x] T001 [US1] `specs/008-calendar-date-selection-fix/spec.md` と Issue #108 の受け入れ条件を照合する
- [x] T002 [US1] `specs/008-calendar-date-selection-fix/plan.md` に沿って対象ファイルを確定する

## Phase 2: User Story 1 - 押下日付をサマリーへ反映 (P1)

**Goal**: 当日以前の日付押下で `selectedDate` と `DaySummary` が更新される

**Independent Test**: `CalendarScreen.test.tsx` で `onDayPress` 実行後の `DaySummary` props を検証

- [x] T003 [US1] Red: `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.tsx` に「過去日/当日押下で onDayPress が呼ばれる」失敗テストを追加する
- [x] T004 [US1] Red: `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` に「押下日付が DaySummary.dateString に反映される」失敗テストを追加する
- [x] T005 [US1] Green: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` の日付判定条件を修正する
- [x] T006 [US1] Green: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` の可読性を維持する最小リファクタを行う

## Phase 3: User Story 2 - 未来日を選択不可に維持 (P1)

**Goal**: 未来日押下時に選択状態を変更しない

**Independent Test**: `MonthCalendar.test.tsx` で未来日押下時に `onDayPress` が呼ばれないことを検証

- [x] T007 [US2] Red: `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.tsx` に「未来日押下で onDayPress 未実行」失敗テストを追加する
- [x] T008 [US2] Green: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` で未来日ガードを維持する

## Phase 4: Verification

- [x] T009 `pnpm --filter mobile test -- src/features/calendar/components/__tests__/MonthCalendar.test.tsx --runInBand` を実行して PASS を確認する
- [x] T010 `pnpm --filter mobile test -- src/features/calendar/screens/__tests__/CalendarScreen.test.tsx --runInBand` を実行して PASS を確認する
- [x] T011 `pnpm --filter mobile lint` を実行して PASS を確認する
- [x] T012 `pnpm --filter mobile exec tsc --noEmit` を実行して PASS を確認する

## Dependencies

- T003, T004 完了後に T005 を実施
- T007 完了後に T008 を実施
- T005 と T008 完了後に T009-T012 を実施

## Parallel Examples

- 並列候補 1: T003 と T004（別ファイルの Red テスト）
- 並列候補 2: T009 と T010（独立テスト実行）

## Implementation Strategy

- MVP は US1（押下日付反映）を先に達成し、その後 US2（未来日防止）でガードを確実化する。
