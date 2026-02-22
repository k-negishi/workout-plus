# Tasks: ワークアウト登録画面デザイン変更

**Input**: Design documents from `specs/20260222-登録画面デザイン変更/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅
**TDD**: 全タスクは Red → Green → Refactor で実施（CLAUDE.md 必須）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・未完了依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）
- 各ファイルパスは `apps/mobile/src/` 配下の相対パスで記載

---

## Phase 1: Setup

**目的**: 既存プロジェクトへの追加のみ。新規インフラ・依存追加は不要。

- [ ] T001 plan.md・research.md・spec.md を再読して変更対象4ファイルの現行実装を把握する

---

## Phase 2: Foundational

**目的**: 全ユーザーストーリーの共通基盤。DBスキーマ変更なし・新依存追加なし。

**⚠️ 備考**: 本機能はUIロジックの変更のみ。Phase 2 の追加タスクは不要。Phase 1 完了後すぐに US 実装へ進む。

---

## Phase 3: User Story 1 — 前回記録の統合表示とコピー機能 (Priority: P1) 🎯 MVP

**Goal**: SetRow のインライン前回記録を削除し、ExerciseBlock ヘッダーにコピーアイコン付きバッジを設置。handleCopyAllPrevious を実装して一括コピーを機能させる。

**Independent Test**: 前回記録がある種目の登録画面を開いたとき、各セット行の上に `前回: Xkg × Y` テキストが表示されず、右上バッジにコピーアイコンが表示され、タップで全入力欄に前回値が入ること。

### Tests for User Story 1 ⚠️ 先に書いてFAILさせること

- [ ] T002 [P] [US1] `features/workout/components/__tests__/SetRow.test.tsx` を新規作成し、以下の failing テストを書く: (1) `previousSet` prop を渡しても `前回:` テキストが描画されない (2) `previousLabel` が存在しない状態で前回記録が表示されない
- [ ] T003 [P] [US1] `features/workout/components/__tests__/ExerciseBlock.test.tsx` を新規作成し、以下の failing テストを書く: (1) `previousRecord` があるとき `copy-outline` アイコン付きバッジが表示される (2) バッジタップで `onCopyAllPrevious` が1回呼ばれる (3) `previousRecord` が null のときバッジが非表示
- [ ] T004 [P] [US1] `features/workout/screens/__tests__/RecordScreen.test.tsx` の既存テストに failing ケースを追加: 一括コピーボタンタップで全セット分 `session.updateSet` が呼ばれること

### Implementation for User Story 1

- [ ] T005 [US1] `features/workout/components/SetRow.tsx` — インライン前回記録を削除する。具体的には: L79-88 の `{previousLabel && (...)}` ブロックを削除、`PreviousSetData` 型・`previousSet` prop・`onCopyPrevious` prop・`computePreviousLabel` 関数を削除
- [ ] T006 [US1] `features/workout/components/ExerciseBlock.tsx` — (1) `onCopyPreviousSet` prop・`getPreviousSetData` 関数・`handleCopyPreviousSet` 関数を削除 (2) ヘッダーの前回バッジに `Ionicons name="copy-outline" size={14}` を追加してコピーボタンの見た目を改善
- [ ] T007 [US1] `features/workout/screens/RecordScreen.tsx` の `ExerciseBlockWithPrevious` — (1) `handleCopyAllPrevious` を実装: `previousRecord` と `sets` を使い各セットに `onCopyPreviousSet` をループ呼び出し (2) `onCopyPreviousSet` prop を `ExerciseBlockWithPrevious` に追加して受け渡し (3) `onCopyAllPrevious` の RecordScreen レベルのスタブ（L241-244）を削除
- [ ] T008 [US1] テスト実行: `pnpm --filter mobile test -- --testPathPattern="SetRow|ExerciseBlock|RecordScreen"` を実行して US1 テストが GREEN になることを確認

**Checkpoint**: US1 完了。前回記録インライン表示が消え、コピーボタンが機能する。

---

## Phase 4: User Story 2 — プレースホルダー削除・セット番号デザイン改善 (Priority: P2)

**Goal**: NumericInput のプレースホルダーを削除し、セット番号を丸バッジ → シンプルなテキストラベルに変更する。

**Independent Test**: 登録画面を開いたとき全入力欄が空白（`0` や `kg` 等のプレースホルダーなし）で、セット番号が丸バッジ形式でなくテキスト形式で表示されること。

### Tests for User Story 2 ⚠️ 先に書いてFAILさせること

- [ ] T009 [US2] `features/workout/components/__tests__/SetRow.test.tsx` — US2 の failing テストを追加: (1) `NumericInput` に `placeholder` prop が渡されていない（または空文字）こと (2) セット番号が `testID="set-number"` のテキストとして描画される（丸バッジ View ではない）

### Implementation for User Story 2

- [ ] T010 [US2] `features/workout/components/SetRow.tsx` — (1) `NumericInput` への `placeholder` 渡しを削除（L104 の `placeholder={previousSet?.weight?.toString() ?? '0'}` と L117 削除） (2) セット番号の View+丸バッジ（L94-96）をシンプルなテキストラベルに変更: `<Text style={{ width: 24, fontSize: 14, fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{set.setNumber}</Text>`
- [ ] T011 [US2] テスト実行: `pnpm --filter mobile test -- --testPathPattern="SetRow"` で US2 テストが GREEN になることを確認

**Checkpoint**: US2 完了。プレースホルダーが消え、セット番号が見やすくなった。

---

## Phase 5: User Story 3 — 種目削除ボタン・デフォルト3セット (Priority: P2)

**Goal**: ExerciseBlock に種目削除ボタンを追加し、新規種目追加時のデフォルトセット数を1→3に変更する。

**Independent Test**: (1) 種目ブロックの削除ボタンをタップして種目が消える (2) 新規種目追加時に入力欄が3セット分表示される。

### Tests for User Story 3 ⚠️ 先に書いてFAILさせること

- [ ] T012 [P] [US3] `features/workout/components/__tests__/ExerciseBlock.test.tsx` — US3 の failing テストを追加: `onDeleteExercise` prop をモックして削除ボタン（`accessibilityLabel="[種目名]を削除"`）タップで呼ばれること
- [ ] T013 [P] [US3] `features/workout/hooks/__tests__/useWorkoutSession.test.ts` — US3 の failing テストを追加: `addExercise` 後にストアの `currentSets[id]` の長さが3であること

### Implementation for User Story 3

- [ ] T014 [US3] `features/workout/components/ExerciseBlock.tsx` — (1) `onDeleteExercise: () => void` prop を追加 (2) ヘッダー右エリアに削除ボタンを追加: `<TouchableOpacity onPress={onDeleteExercise} accessibilityLabel={\`${exercise.name}を削除\`}><Ionicons name="trash-outline" size={18} color="#94a3b8" /></TouchableOpacity>`
- [ ] T015 [US3] `features/workout/screens/RecordScreen.tsx` の `ExerciseBlockWithPrevious` — (1) `onDeleteExercise: (workoutExerciseId: string) => void` prop を追加 (2) `<ExerciseBlock>` に `onDeleteExercise={() => onDeleteExercise(workoutExerciseId)}` を渡す
- [ ] T016 [US3] `features/workout/screens/RecordScreen.tsx` — `handleDeleteExercise` を追加: `const handleDeleteExercise = useCallback((workoutExerciseId: string) => { void session.removeExercise(workoutExerciseId); }, [session]);` を実装し、`ExerciseBlockWithPrevious` に `onDeleteExercise={handleDeleteExercise}` を渡す
- [ ] T017 [US3] `features/workout/hooks/useWorkoutSession.ts` の `addExercise` — デフォルトセット数を1→3に変更: `SetRepository.create` を `Promise.all([1,2,3].map(...))` で3つ並行作成し、`store.setSetsForExercise(id, initialSets)` に更新
- [ ] T018 [US3] テスト実行: `pnpm --filter mobile test -- --testPathPattern="ExerciseBlock|useWorkoutSession"` で US3 テストが GREEN になることを確認

**Checkpoint**: US3 完了。種目削除ボタンが機能し、新規種目が3セットで初期化される。

---

## Phase 6: User Story 4 — セット行間の統一 (Priority: P3)

**Goal**: US1 でインライン前回記録（行間を広げていた原因）を削除済みのため、追加実装不要。

**Independent Test**: 前回記録あり/なしの両ケースで各セット行の間隔が目視で同一であることを確認する。

- [ ] T019 [US4] iOS シミュレーターで登録画面を開き、前回記録ありの種目と前回記録なしの種目でセット行間が視覚的に同一であることを目視確認する（`pnpm --filter mobile ios` で起動）

**Checkpoint**: US4 完了（US1 の副次効果で自動解消）。

---

## Phase 7: Polish & 品質チェック

**目的**: 全ストーリー横断の型チェック・Lint・最終テスト実行

- [ ] T020 [P] 型チェック実行: `pnpm --filter mobile tsc --noEmit` が 0 エラーで通ること
- [ ] T021 [P] Lint 実行: `pnpm lint` が 0 エラー・0 警告で通ること
- [ ] T022 全テスト実行: `pnpm --filter mobile test --coverage` でカバレッジ閾値（90%）が維持されていることを確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 依存なし — 即座に開始可能
- **Phase 2 (Foundational)**: Phase 1 完了後 — 追加タスクなし（スキップ）
- **Phase 3 (US1)**: Phase 1 完了後に開始可能
- **Phase 4 (US2)**: Phase 3 完了後推奨（SetRow を同じファイルで変更するため競合回避）
- **Phase 5 (US3)**: Phase 3 完了後（ExerciseBlock を同じファイルで変更するため）
- **Phase 6 (US4)**: Phase 3 完了で自動解消
- **Phase 7 (Polish)**: 全ユーザーストーリー完了後

### User Story Dependencies

- **US1 (P1)**: Phase 1 後に開始可能 — 他ストーリーへの依存なし
- **US2 (P2)**: US1 完了後（SetRow 競合回避）— US1 の成果物に依存しない（異なる変更箇所）
- **US3 (P2)**: US1 完了後（ExerciseBlock 競合回避）— US1 の成果物に依存しない
- **US4 (P3)**: US1 の副次効果で解消済み

### Within Each User Story

1. テストを書いて FAIL させる（Red）
2. 実装して GREEN にする（Green）
3. リファクタリング（Refactor）

### Parallel Opportunities

- T002, T003, T004 は並列実行可能（異なるテストファイル）
- T012, T013 は並列実行可能（異なるテストファイル）
- T020, T021 は並列実行可能（独立したチェック）
- US2 と US3 は US1 完了後に並列実行可能（異なるファイル）

---

## Parallel Example

```bash
# US1 テスト作成: 並列実行可能
Agent A: T002 SetRow.test.tsx（インライン前回記録テスト）
Agent B: T003 ExerciseBlock.test.tsx（コピーボタンテスト）
Agent C: T004 RecordScreen.test.tsx（一括コピーテスト）

# US1 完了後: US2・US3 を並列実行可能
Agent A: Phase 4 (US2) — SetRow のプレースホルダー削除・セット番号
Agent B: Phase 5 (US3) — ExerciseBlock 削除ボタン + useWorkoutSession 3セット
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. T001 (Setup)
2. T002〜T004 (US1 テスト作成・FAIL確認)
3. T005〜T007 (US1 実装・GREEN確認)
4. T008 (US1 テスト通過確認)
5. **STOP and VALIDATE**: 登録画面の前回記録・コピー動作を確認

### Incremental Delivery

1. US1 → コピー機能が動作する最小構成
2. US2 → プレースホルダー問題を解消
3. US3 → 削除ボタン + デフォルト3セット追加
4. US4 → US1 の副次効果で解消済み
5. Polish → 型チェック・Lint・カバレッジ確認

---

## Notes

- `[P]` タスクは異なるファイルを扱い、依存なしで並列実行可能
- `[Story]` ラベルはトレーサビリティのためにユーザーストーリーにタスクをマッピング
- 各ユーザーストーリーは独立して完了・テスト可能
- **必ず**: テストを書いて FAIL させてから実装を始める（CLAUDE.md 規約）
- ExerciseBlock は US1 と US3 の両方で変更される → US3 は US1 の変更を前提に実装
- `Ionicons` は `@expo/vector-icons` から既にインポート可能（既存導入済み）
