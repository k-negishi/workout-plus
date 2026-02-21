# Tasks: タイマー停止確認モーダル

**Input**: Design documents from `/specs/004-timer-stop-confirm/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup

目的: 既存モバイルアプリへの差分実装。依存追加なし。

- [X] T001 `apps/mobile/src/types/workout.ts` の `TimerStatus` を `'notStarted' | 'running' | 'paused' | 'discarded'` に拡張する

## Phase 2: User Story 1 (P1) タイマー停止確認モーダル

目的: × ボタン押下で確認モーダルを表示し、ワークアウトを破棄せずタイマーのみ停止できるようにする。

独立テスト基準: × 押下で確認モーダル表示、「キャンセル」で状態不変、「停止する」で `discarded` 遷移。

### Tests (Red)

- [X] T002 [P] [US1] `apps/mobile/src/features/workout/hooks/__tests__/useTimer.test.ts` に `stopTimer()` の失敗テストを追加する（`running/paused -> discarded`、`elapsedSeconds=0`、`timerStartedAt=null`）
- [X] T003 [P] [US1] `apps/mobile/src/features/workout/screens/__tests__/RecordScreen.test.tsx` に失敗テストを追加する（×押下で `Alert.alert`、キャンセルで `stopTimer` 未呼び出し、停止で `stopTimer` 呼び出し、`session.discardWorkout` 非呼び出し）

### Implementation (Green)

- [X] T004 [US1] `apps/mobile/src/features/workout/hooks/useTimer.ts` に `stopTimer()` を追加し、`UseTimerReturn` に `stopTimer: () => void` を追加する
- [X] T005 [US1] `apps/mobile/src/features/workout/components/TimerBar.tsx` を更新する（`onDiscard` -> `onStopTimer`、`discarded` 時に × 非表示・▶ 無効化・表示を「時間なし」に変更）
- [X] T006 [US1] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` を更新する（確認文言変更、`session.discardWorkout()` と `goBack()` を削除、`timer.stopTimer()` 呼び出しへ変更）

### Validation

- [X] T007 [US1] `pnpm --filter mobile test -- useTimer.test.ts RecordScreen.test.tsx` を実行して US1 のテストを通す

## Phase 3: User Story 2 (P1) タイマー停止後も登録可能

目的: `discarded` 状態で完了したワークアウトを所要時間なしとして保存・表示できるようにする。

独立テスト基準: サマリー画面で `discarded` の所要時間が「―」になる。タイマー停止後も完了登録できる。

### Tests (Red)

- [X] T008 [P] [US2] `apps/mobile/src/features/workout/screens/__tests__/WorkoutSummaryScreen.test.tsx` に失敗テストを追加する（`timer_status='discarded'` で「―」表示、通常状態で時間表示）
- [X] T009 [P] [US2] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` と `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` に回帰テストを追加する（`discarded`/時間なしデータでクラッシュしない）

### Implementation (Green)

- [X] T010 [US2] `apps/mobile/src/features/workout/screens/WorkoutSummaryScreen.tsx` を更新する（`timer_status` を取得し `discarded` 時は「―」を表示）
- [X] T011 [US2] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` と `apps/mobile/src/features/calendar/components/DaySummary.tsx` を更新し、時間なしデータ（`discarded` または 0）を安全に表示する

### Validation

- [X] T012 [US2] `pnpm --filter mobile test -- WorkoutSummaryScreen.test.tsx HomeScreen.test.tsx CalendarScreen.test.tsx` を実行して US2 のテストを通す

## Phase 4: Polish & Quality Gates

目的: 型・Lint・全体テストを満たして実装完了とする。

- [X] T013 [P] `pnpm --filter mobile tsc --noEmit` を実行して型エラー 0 を確認する
- [X] T014 [P] `pnpm lint` を実行して Lint エラー 0 を確認する
- [X] T015 `pnpm --filter mobile test --coverage` を実行して回帰がないことを確認する

## Dependencies

- T001 完了後に T002/T003/T005/T008/T009 を開始可能
- T004 は T002 の後に実施
- T006 は T003/T004/T005 の後に実施
- T010 は T008 の後に実施
- T011 は T009 の後に実施
- T012 は T010/T011 の後に実施
- T013/T014/T015 は T007/T012 の後に実施

## Parallel Example

```bash
# Foundation
T001

# US1/US2 Red を並列実行
T002, T003, T008, T009

# US1 Green
T004, T005, T006

# US2 Green
T010, T011

# Validation / Gates
T007, T012, T013, T014, T015
```

## Implementation Strategy

- まず US1（T002-T007）を完了して誤操作の破棄リスクを潰す
- 次に US2（T008-T012）で時間なし保存・表示の一貫性を担保する
- 最後に品質ゲート（T013-T015）を通して完了とする
