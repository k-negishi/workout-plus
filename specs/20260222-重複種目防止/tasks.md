# Tasks: 重複種目防止 + 種目選択UI改善

**Input**: specs/20260222-重複種目防止/spec.md, plan.md
**Branch**: `20260222-重複種目防止`

## Phase 1: US1 - 重複種目追加の防止（P1）🎯 MVP

**Goal**: `useWorkoutSession.addExercise()` に重複チェックを追加し、同一ワークアウトへの重複登録をブロックする

### Tests for US1（先行作成・必ずREDを確認してから実装）

- [ ] T001 [US1] useWorkoutSession.test.ts に重複チェックテストを追加する
  - ファイル: `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.test.ts`
  - ケース1: 「同じ exerciseId を2回 addExercise() しても currentExercises.length が増加しない」
  - ケース2: 「異なる exerciseId は2件目も追加できる」

### Implementation for US1

- [ ] T002 [US1] useWorkoutSession.ts の addExercise() に重複チェックを追加する
  - ファイル: `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts`
  - `store.currentExercises.some((e) => e.exerciseId === exerciseId)` で判定
  - 重複時はサイレントリターン（A案: UI側で無効化するためトーストなし）

**Checkpoint**: T001 テストが PASS になれば US1 完了

---

## Phase 2: US2 - 追加済み種目の視覚的識別（P2）

**Goal**: ExercisePickerScreen で追加済み種目をグレーアウト + 「✓ 追加済み」バッジ表示し、タップを無効化する

### Tests for US2（先行作成・必ずREDを確認してから実装）

- [ ] T003 [US2] ExercisePickerScreen のテストを作成する（新規）
  - ファイル: `apps/mobile/src/features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx`
  - ケース1: 「currentExercises に含まれる種目に "追加済み" テキストが表示される」
  - ケース2: 「追加済み種目の行を押しても session.addExercise が呼ばれない」
  - ケース3: 「currentExercises に含まれない種目の行を押すと session.addExercise が呼ばれる」

### Implementation for US2

- [ ] T004 [US2] ExercisePickerScreen.tsx に追加済みバッジとタップ無効化を実装する
  - ファイル: `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx`
  - `useWorkoutSessionStore` から `currentExercises` を取得
  - `useMemo` で `addedExerciseIds: Set<string>` を構築
  - renderItem で `isAdded` フラグを判定
  - `isAdded === true` の行: `disabled={true}` + `opacity: 0.5` + 「✓ 追加済み」バッジ表示
  - single モード: `isAdded` なら `handleSelectExercise` を呼ばない
  - multi モード: `isAdded` なら `setSelectedIds` のトグルを無効化

**Checkpoint**: T003 テストが PASS になれば US2 完了

---

## Phase 3: 品質チェック

- [ ] T005 [P] pnpm --filter mobile test を実行して全テスト PASS を確認する
- [ ] T006 [P] pnpm lint を実行して ESLint エラーゼロを確認する
- [ ] T007 [P] pnpm --filter mobile tsc --noEmit を実行して型エラーゼロを確認する

---

## Dependencies & Execution Order

- T001 → T002（テストを先に書いてREDを確認してから実装）
- T003 → T004（テストを先に書いてREDを確認してから実装）
- T001 と T003 は並列実行可能
- T005/T006/T007 は T002 と T004 完了後に並列実行可能
