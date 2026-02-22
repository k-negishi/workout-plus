# Tasks: +ボタンをワイヤーフレーム準拠に修正

**Input**: Design documents from `/specs/005-fix-plus-button-wf/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-navigation-contract.md, quickstart.md

## Phase 1: Setup

目的: 実装対象とテスト対象を固定し、TDDの土台を作る。

- [X] T001 `apps/mobile/src/app/MainTabs.tsx` の現行実装をWF差分観点（サイズ・位置・境界・影・+記号）で確認する
- [X] T002 `apps/mobile/src/app/__tests__/MainTabs.test.tsx` の既存テストを確認し、見た目契約の不足点を洗い出す

## Phase 2: User Story 1 (P1) 中央+ボタンのWF準拠表示

目的: 中央+ボタンをWF `add-button` と一致した見た目で表示する。

独立テスト基準: `record-tab-button` が 56x56 円形・境界・影・中央 `+` を持つことをテストで検証できる。

### Tests (Red)

- [X] T003 [US1] `apps/mobile/src/app/__tests__/MainTabs.test.tsx` に失敗テストを追加する（中央+記号表示、WF準拠スタイル）

### Implementation (Green)

- [X] T004 [US1] `apps/mobile/src/app/MainTabs.tsx` の中央ボタン実装を修正し、WF準拠スタイルと中央 `+` を反映する

### Validation

- [X] T005 [US1] `pnpm --filter mobile test -- MainTabs.test.tsx --runInBand` を実行して US1 テストを通す

## Phase 3: User Story 2 (P1) +ボタンの導線維持

目的: +ボタン押下で `RecordStack` 遷移が確実に発火することを保証する。

独立テスト基準: +ボタン押下で `navigate('RecordStack')` 呼び出しを確認できる。

### Tests (Red)

- [X] T006 [US2] `apps/mobile/src/app/__tests__/MainTabs.test.tsx` に失敗テストを追加する（+ボタン押下時の遷移発火）

### Implementation (Green)

- [X] T007 [US2] `apps/mobile/src/app/MainTabs.tsx` を必要最小限修正し、押下イベントの導線を保持する

### Validation

- [X] T008 [US2] `pnpm --filter mobile test -- MainTabs.test.tsx --runInBand` を再実行して US1/US2 を通す

## Phase 4: Polish & Cross-Cutting

目的: タスク反映と最終検証。

- [X] T009 `specs/005-fix-plus-button-wf/tasks.md` の完了タスクを `[X]` に更新する
- [X] T010 `pnpm --filter mobile lint` を実行し、今回変更ファイルでLintエラーがないことを確認する

## Dependencies

- T001, T002 完了後に T003 へ着手
- T004 は T003 失敗確認後に着手
- T005 は T004 完了後に実施
- T006 は T005 後に着手
- T007 は T006 失敗確認後に着手
- T008 は T007 完了後に実施
- T009, T010 は T008 完了後に実施

## Parallel Example

```bash
# 並列可能（調査系）
T001 & T002

# 実装後の検証
T008 && T010
```

## Implementation Strategy

1. US1 の見た目契約テストを先に作り、表示差分を固定する
2. 最小修正でMainTabsをWF準拠に揃える
3. US2 の導線テストで遷移回帰を防ぐ
4. Lint/テストを通し、tasks を完了状態に更新する
