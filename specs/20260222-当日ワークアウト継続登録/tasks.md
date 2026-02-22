# Tasks: 当日ワークアウット継続登録

**Input**: Design documents from `specs/20260222-当日ワークアウト継続登録/`
**Prerequisites**: plan.md ✅ / spec.md ✅ / research.md ✅ / data-model.md ✅

**Tests**: TDD 必須（CLAUDE.md 規約）。テストを先に書き、失敗を確認してから実装する。

**Organization**: ユーザーストーリーごとにフェーズを分けて独立実装・テストを可能にする。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可能（異なるファイル、未完了依存なし）
- **[US?]**: 対応するユーザーストーリー（US1〜US4）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（初期確認）

**Purpose**: 既存コードの状態確認。本機能はプロジェクト初期化済みのため設定タスクなし。

- [ ] T001 既存テストが全て通過することを確認: `pnpm --filter mobile test`

---

## Phase 2: Foundational（全ストーリーの前提）

**Purpose**: 全ユーザーストーリーが依存する基盤コードを先に完成させる

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を開始しない

### T002-T003: WorkoutRepository 拡張

- [ ] T002 [US-base] `apps/mobile/src/database/repositories/__tests__/workout.test.ts` に `findTodayCompleted()` のテストを追加（当日あり・なし・前日のみ・completed_at=null の4ケース）— **テストが RED になることを確認してから T003 へ**
- [ ] T003 [US-base] `apps/mobile/src/database/repositories/workout.ts` に `findTodayCompleted(): Promise<WorkoutRow | null>` を実装（端末ローカル時刻で当日範囲を計算、status='completed' かつ completed_at が当日範囲内の最新1件を返す）

### T004-T006: workoutSessionStore 拡張

- [ ] T004 [P] [US-base] `apps/mobile/src/stores/__tests__/workoutSessionStore.test.ts` に `continuationBaseExerciseIds` の初期値・setContinuationBaseExerciseIds・reset() 時の null リセットのテストを追加 — **RED 確認後に T005 へ**
- [ ] T005 [P] [US-base] `apps/mobile/src/stores/workoutSessionStore.ts` に `continuationBaseExerciseIds: string[] | null` フィールドと `setContinuationBaseExerciseIds` アクションを追加。`reset()` で null にリセット

### T006: ナビゲーション型拡張

- [ ] T006 [P] [US-base] `apps/mobile/src/types/navigation.ts` の `RecordStackParamList.Record` を `{ workoutId?: string } | undefined` に変更し、`RootStackParamList.RecordStack` も同様に拡張

**Checkpoint**: `pnpm --filter mobile tsc --noEmit` でエラーゼロ・`pnpm --filter mobile test` が全 PASS。ユーザーストーリー実装を開始できる。

---

## Phase 3: User Story 1 - +ボタンから継続登録 (Priority: P1) 🎯 MVP

**Goal**: +ボタンを押したとき、当日完了済みワークアウットがあれば継続モードで RecordScreen を開く。既存種目が表示され、新しい種目を追加して1件として完了できる。

**Independent Test**: 当日完了済みワークアウットがある状態で+ボタンをタップ → 既存種目が表示された RecordScreen が開く → 新種目を追加して完了 → 1件のワークアウットとして詳細画面に反映されることを確認

### Tests for User Story 1（先に書く）

- [ ] T007 [US1] `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.continuation.test.ts` を新規作成し、`startSession(workoutId)` の継続モードテストを記述（workoutId 指定時に既存ワークアウットを recording に再オープン、種目・セットが store に復元される、continuationBaseExerciseIds が設定される）— **RED 確認後に T008 へ**

### Implementation for User Story 1

- [ ] T008 [US1] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` の `startSession()` を `startSession(workoutId?: string)` に拡張。workoutId 指定時は: WorkoutRepository.findById → update(status:'recording') → 種目・セットを store に復元 → setContinuationBaseExerciseIds → timerStatus='notStarted'、elapsedSeconds=0 に設定（T007 のテストが GREEN になることを確認）
- [ ] T009 [US1] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` を修正: `useRoute<RouteProp<RecordStackParamList, 'Record'>>()` で workoutId を取得し、`session.startSession(workoutId)` に渡す
- [ ] T010 [US1] `apps/mobile/src/app/MainTabs.tsx` の+ボタン `onPress` を `handleRecordPress` に変更: 1. `findRecording()` → あれば `navigate('RecordStack')` 2. `findTodayCompleted()` → あれば `navigate('RecordStack', { workoutId })` 3. なければ `navigate('RecordStack')`

**Checkpoint**: +ボタンから継続モードが起動し、既存種目が表示 → 種目追加 → 完了 → ワークアウット詳細で全種目が確認できる

---

## Phase 4: User Story 2 - 継続モードのデータ保護 (Priority: P2)

**Goal**: 継続中に破棄すると追加分のみ削除され既存データが保護される。アプリ再起動後に継続セッションが復元される。

**Independent Test**: 継続モードで種目を追加 → 破棄 → ワークアウット詳細で元の種目のみ表示されることを確認

### Tests for User Story 2（先に書く）

- [ ] T011 [US2] `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.continuation.test.ts` に `discardWorkout()` の継続モードテストを追加（新規追加種目のみ削除・元の種目は保持・ワークアウットが completed に戻る）— **RED 確認後に T012 へ**

### Implementation for User Story 2

- [ ] T012 [US2] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` の `discardWorkout()` に継続モード分岐を追加: `continuationBaseExerciseIds !== null` の場合は新規追加種目を削除し `WorkoutRepository.update({ status: 'completed' })` で完了状態に戻す。通常モードは既存ロジックを維持（T011 のテストが GREEN になることを確認）

**Checkpoint**: 継続モードで破棄しても元のワークアウットが完全に保持されている

---

## Phase 5: User Story 4 - 詳細画面から継続 (Priority: P2)

**Goal**: ワークアウット詳細画面に「続きを記録」ボタンを追加。当日のワークアウットのみに表示し、編集との混乱を防ぐ。

**Independent Test**: 当日ワークアウット詳細画面で「続きを記録」ボタンが表示され、過去のワークアウット詳細では表示されないことを確認

### Tests for User Story 4（先に書く）

- [ ] T013 [P] [US4] `apps/mobile/src/features/workout/screens/__tests__/WorkoutDetailScreen.continuation.test.tsx` を新規作成し、当日ワークアウット時にボタン表示・過去ワークアウット時に非表示・ボタンタップで正しい workoutId で RecordStack に遷移することをテスト — **RED 確認後に T014 へ**

### Implementation for User Story 4

- [ ] T014 [P] [US4] `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` に「続きを記録」ボタンを追加: `completed_at` と今日の日付を比較して当日判定し、`navigation.navigate('RecordStack', { workoutId })` で継続モードへ遷移（T013 のテストが GREEN になることを確認）

**Checkpoint**: 詳細画面から継続モードへの導線が機能する。+ボタンと同じ継続モードが起動する。

---

## Phase 6: User Story 3 - 継続後のサマリー表示 (Priority: P3)

**Goal**: 継続完了後のサマリーに既存種目＋追加種目の全てが表示される。PR も正常に反映される。

**Independent Test**: 継続モードで種目を追加して完了 → サマリー画面に既存種目と追加種目の両方が表示されることを確認

### Verification for User Story 3

- [ ] T015 [US3] `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.continuation.test.ts` に `completeWorkout()` の継続モードテストを追加（全種目＝既存＋追加がサマリーデータに含まれる・PR が正常に計算される）— 既存の `completeWorkout()` ロジックがそのまま機能するか確認
- [ ] T016 [US3] T015 でテストが失敗する場合のみ `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` の `completeWorkout()` を修正。通常は既存ロジックで全種目が含まれるため修正不要の見込み

**Checkpoint**: 継続完了後のサマリーで全種目・PR が正常表示される

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 品質チェックと仕上げ

- [ ] T017 [P] `pnpm --filter mobile test --coverage` を実行し変更ファイルのカバレッジが 90%+ であることを確認
- [ ] T018 [P] `pnpm --filter mobile tsc --noEmit` で型エラーゼロを確認
- [ ] T019 [P] `pnpm lint` で ESLint エラーゼロを確認
- [ ] T020 既存テストが全て通過することを確認（リグレッションなし）: `pnpm --filter mobile test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（確認）**: 即座に開始可能
- **Phase 2（Foundational）**: Phase 1 完了後。**全ユーザーストーリーをブロック**
- **Phase 3（US1 MVP）**: Phase 2 完了後に開始。最優先
- **Phase 4（US2）**: Phase 3 の T008（discardWorkout 前の hook 変更）完了後
- **Phase 5（US4）**: Phase 2 完了後に Phase 3 と並列実行可能
- **Phase 6（US3）**: Phase 3 完了後（completeWorkout への依存）
- **Phase 7（仕上げ）**: 全フェーズ完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に開始。他ストーリーへの依存なし
- **US2 (P2)**: US1 の T008（useWorkoutSession 拡張）完了後に開始
- **US4 (P2)**: Phase 2 完了後に US1 と並列実行可能（別ファイル）
- **US3 (P3)**: US1 完了後（completeWorkout の動作確認が前提）

### Parallel Opportunities

- T004, T005, T006（Phase 2 内）: 並列実行可能
- T013, T014（US4）: US1 の T007〜T010 と並列実行可能
- T017, T018, T019（Phase 7 内）: 並列実行可能

---

## Parallel Example: Phase 2 + US1/US4 同時進行

```
# Phase 2 を並列で完了:
Agent A: T002 → T003 (WorkoutRepository)
Agent B: T004 → T005 (Store)
Agent C: T006 (navigation.ts)

# Phase 2 完了後、US1 と US4 を並列:
Agent A: T007 → T008 → T009 → T010 (US1: hook + RecordScreen + MainTabs)
Agent B: T013 → T014 (US4: WorkoutDetailScreen)
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. Phase 1: 既存テスト確認
2. Phase 2: Foundational（T001〜T006）
3. Phase 3: US1（T007〜T010）
4. **STOP & VALIDATE**: +ボタン継続モードが動作することを手動確認
5. 問題なければ Phase 4〜6 に進む

### Incremental Delivery

1. Phase 2 完了 → 基盤整備
2. Phase 3（US1）完了 → +ボタン継続登録が機能（MVP）
3. Phase 4（US2）完了 → データ保護が保証される
4. Phase 5（US4）完了 → 詳細画面からも継続可能
5. Phase 6（US3）完了 → サマリー表示の確認

---

## Notes

- TDD 必須: テストを先に書き **RED** を確認してから実装（**GREEN** にする）
- `[P]` タスクは異なるファイルを扱うため並列実行可能
- Phase 2 完了前にユーザーストーリーの実装を開始しない
- 各フェーズ末尾の Checkpoint で動作確認してから次フェーズへ
- `continuationBaseExerciseIds` が `null` の場合は既存ロジックを変更しない（既存テストを壊さない）
