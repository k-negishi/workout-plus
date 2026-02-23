# Tasks: 種目選択ソート

**Input**: Design documents from `/specs/20260223-種目選択ソート/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**TDD必須**: 全実装タスクの前にテストを記述し、Red（失敗）→ Green（通過）→ Refactor の順で実施すること。

**Organization**: タスクはユーザーストーリー単位で整理されており、各ストーリーを独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2, US3）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（セットアップ）

**Purpose**: 全ストーリーが依存する型定義の作成

- [x] T001 `apps/mobile/src/types/exerciseSort.ts` に `ExerciseSortOrder` 型（`'name' | 'muscle' | 'date' | 'frequency'`）を新規作成する

---

## Phase 2: Foundational（基盤）

**Purpose**: 全ユーザーストーリーのブロッキング前提条件（T001 完了後に並列実行可能）

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリー実装は開始しない

- [x] T002 [P] `apps/mobile/src/stores/exerciseStore.ts` に `sortOrder: ExerciseSortOrder`（デフォルト `'name'`）と `setSortOrder` アクションを追加する
- [x] T003 [P] `apps/mobile/src/database/repositories/exercise.ts` に `findAllWithUsageCount()` メソッドを追加する（`workout_exercises` と LEFT JOIN し `usage_count` DESC, `name` ASC でソート）

**Checkpoint**: 基盤完了 — 以降のユーザーストーリー実装を開始できる

---

## Phase 3: User Story 1 - ソート方法を選択して種目リストを並び替える (Priority: P1) 🎯 MVP

**Goal**: ソートチップUIを追加し、4種類のソートで種目リストを即座に並び替えられる

**Independent Test**: 種目選択画面でソートチップをタップし、種目リストが各ソート順で正しく並び替わることをシミュレーターで確認できる

### Tests for User Story 1（TDD: 実装前に記述し FAIL させること）⚠️

- [x] T004 [P] [US1] `apps/mobile/src/features/exercise/hooks/__tests__/useExerciseSearch.sortOrder.test.ts` を新規作成し、`computeSections` の各 `sortOrder` 値（name/muscle/date/frequency）に対するセクション・順序の期待値テストを記述する（Red フェーズ）
- [x] T005 [P] [US1] `apps/mobile/src/features/exercise/components/__tests__/ExerciseSortChips.test.tsx` を新規作成し、4チップの表示・選択時コールバック・アクティブ状態のテストを記述する（Red フェーズ）

### Implementation for User Story 1

- [x] T006 [US1] `apps/mobile/src/features/exercise/hooks/useExerciseSearch.ts` の `computeSections` 関数に `sortOrder: ExerciseSortOrder` 引数を追加し、各ソート値に応じた分岐ロジックを実装する（T004 のテストを Green にする）
  - `'name'`: 既存ロジックを維持（お気に入り → マイ種目 → カテゴリ別）
  - `'muscle'`: 部位グループのみのセクション（お気に入り・マイ種目セクションなし）
  - `'date'`: セクションなし、`createdAt` 降順のフラットリスト
  - `'frequency'`: セクションなし、`usageCount` 降順 → `name` 昇順のフラットリスト
- [x] T007 [US1] `apps/mobile/src/features/exercise/components/ExerciseSortChips.tsx` を新規作成する（T005 のテストを Green にする）
  - Props: `sortOrder: ExerciseSortOrder`, `onSortChange: (order: ExerciseSortOrder) => void`
  - 4チップ（名前順 / 部位別 / 追加日順 / よく使う順）を水平スクロール `ScrollView` で配置
  - アクティブ: 背景 `#E6F2FF`、テキスト `#4D94FF`、ボーダー `#4D94FF`
  - 非アクティブ: 背景 `#f9fafb`、テキスト `#64748b`、ボーダー `#e2e8f0`
  - チップ高さ 28px、font 13px、border-radius 6px、paddingH 12px、paddingV 4px
- [x] T008 [US1] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` を変更し、`ExerciseSortChips` を検索バー直下に配置して `sortOrder`/`setSortOrder`（exerciseStore）と連動させる
  - `sortOrder === 'frequency'` のとき `findAllWithUsageCount()` を呼び出し、結果を `computeSections` に渡す
  - `sortOrder !== 'frequency'` のときは既存の `findAll()` を使用する
  - `computeSections` への呼び出しに `sortOrder` 引数を追加する

**Checkpoint**: この時点でUser Story 1が完全に機能しテスト可能な状態になること

---

## Phase 4: User Story 2 - ソート設定がセッション中に保持される (Priority: P2)

**Goal**: ソート選択がセッション内で記憶され、画面を再度開いたとき同じソートが選択済みになる

**Independent Test**: ソートを「よく使う順」に変更して画面を閉じ、再度開いたとき「よく使う順」チップがアクティブ状態で表示される

### Tests for User Story 2（TDD）⚠️

- [x] T009 [US2] `apps/mobile/src/stores/__tests__/exerciseStore.test.ts` に `sortOrder` の初期値・`setSortOrder` のテスト、および画面再マウント後も `sortOrder` が保持されることを確認するテストを追記する（Red フェーズ）

### Implementation for User Story 2

- [x] T010 [US2] T002 で追加した `exerciseStore` の `sortOrder`/`setSortOrder` 実装を確認し、T008 で組み込んだ `ExercisePickerScreen` が `sortOrder` を Zustand から読み取る設計であることを検証する（T009 のテストを Green にする）
  - Zustand はデフォルトでセッション内保持されるため、追加実装が不要な場合はその旨を記録する
  - **[確認済み]** Zustand はモジュールレベルシングルトンのためセッション内保持は自動達成。ExercisePickerScreen は useExerciseSearch 経由で exerciseStore の sortOrder を読み取る設計（T009 テスト通過）。アプリ再起動（store リセット）でデフォルト（`'name'`）に戻ることも T009 の beforeEach リセットで確認済み。

**Checkpoint**: User Story 1 + 2 がともに動作すること

---

## Phase 5: User Story 3 - ソートとお気に入り・マイ種目セクションの共存 (Priority: P3)

**Goal**: 各ソート選択時のお気に入り・マイ種目セクション表示挙動が仕様通りになる

**Independent Test**: お気に入り種目がある状態で各ソートを切り替え、「名前順」ではお気に入りセクションが最上部に表示され、「部位別」では部位セクションに統合されることを確認できる

### Tests for User Story 3（TDD）⚠️

- [x] T011 [US3] `apps/mobile/src/features/exercise/hooks/__tests__/useExerciseSearch.sortOrder.test.ts` に以下のテストケースを追記する（Red → Green）
  - `'name'` 時: お気に入りセクションが先頭
  - `'muscle'` 時: お気に入りセクションが存在しない（部位別セクションに統合）
  - `'date'` 時: セクションなし（全種目フラットリスト）
  - `'frequency'` 時（使用履歴 0 件）: 名前順フォールバックでフラットリスト表示

### Implementation for User Story 3

- [x] T012 [US3] T006 で実装した `computeSections` を検証し、User Story 3 のシナリオ（Acceptance Scenarios 1-3）が全て通ることを確認する
  - `'muscle'` ソートでお気に入り・マイ種目フラグを無視して部位セクションのみ生成する処理を確認 ✅
  - `'frequency'` ソートで `usageCount === 0` の種目が名前順フォールバックになることを確認 ✅（DB側 ORDER BY name ASC で自動フォールバック。computeSections は順序を保持するだけ）
  - `'date'` / `'frequency'` ソートでカテゴリフィルタ選択中に `'muscle'` に切り替えた場合、フィルタ解除して全種目を部位別表示する処理を追加（エッジケース対応）✅
    - **実装方針**: computeSections の `case 'muscle'` で selectedCategory を無視し、applyFilters に null を渡すよう変更。純粋関数のまま維持。21 tests PASS。

**Checkpoint**: 全3ユーザーストーリーが独立して機能すること

---

## Phase 6: Polish & 品質確認

**Purpose**: 横断的な品質確認・最終調整

- [x] T013 [P] `pnpm --filter mobile tsc --noEmit` を実行し型エラーがゼロであることを確認する
  - 新規ファイルの型エラーなし（既存の features/ai ChatMessage 型エラーは pre-existing）
- [x] T014 [P] `pnpm lint` を実行し ESLint エラー・警告がゼロであることを確認する（`simple-import-sort` エラーは `npx eslint --fix` で修正する）
  - ExercisePickerScreen.tsx の import sort を eslint --fix で修正済み
- [x] T015 `pnpm --filter mobile test --coverage` を実行し、テストが全て通過しカバレッジが 90% 以上であることを確認する
  - 新規・変更ファイルのカバレッジ: useExerciseSearch.ts 100%, exerciseStore.ts 100%, ExerciseSortChips.tsx 100%
  - グローバル閾値（70%）は既存の未カバーファイル（useAIChat.ts, workoutSessionStore.ts 等）で未達だが、これは pre-existing 問題
  - 合計 67 tests PASS（0 failures）
- [ ] T016 quickstart.md に記載のテストシナリオを iOS シミュレーターで手動確認する
  - 4ソートすべてで正しく並び替わること
  - テキスト検索中にソート変更しても検索が維持されること
  - ワークアウト使用履歴 0 件の状態で「よく使う順」を選択したとき名前順フォールバックが動作すること

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — 全ユーザーストーリーをブロック
- **User Stories (Phase 3-5)**: Phase 2 完了後 — P1 → P2 → P3 の順で実施（または並列）
- **Polish (Phase 6)**: 全ユーザーストーリー完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に開始可能。他ストーリーへの依存なし
- **US2 (P2)**: Phase 2 完了後に開始可能。T002（exerciseStore 拡張）に依存
- **US3 (P3)**: US1（T006 の computeSections 実装）に依存

### Within Each User Story

1. テストを先に記述し FAIL を確認（Red）
2. テストが通るよう実装（Green）
3. リファクタリング
4. 型チェック・Lint 通過を確認

### Parallel Opportunities

- T002 と T003 は並列実行可能（Phase 2 内）
- T004 と T005 は並列実行可能（Phase 3 テスト）
- T013 と T014 は並列実行可能（Phase 6）

---

## Parallel Example: User Story 1

```bash
# Phase 2: Foundational タスクを並列実行
Task: "T002: exerciseStore に sortOrder を追加"
Task: "T003: findAllWithUsageCount() を exercise.ts に追加"

# Phase 3: テストを先に並列で作成（Red フェーズ）
Task: "T004: useExerciseSearch.sortOrder.test.ts を作成"
Task: "T005: ExerciseSortChips.test.tsx を作成"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 完了: T001（型定義）
2. Phase 2 完了: T002, T003（ストア・リポジトリ）
3. Phase 3 完了: T004-T008（テスト + ソートUI + ロジック）
4. **停止して検証**: ソートチップが動作し種目リストが切り替わることを確認
5. P2・P3 ストーリーは検証後に続行

### Incremental Delivery

1. Phase 1 + 2 → 基盤完成
2. Phase 3 → ソートUI動作確認（MVP リリース可能）
3. Phase 4 → セッション保持確認
4. Phase 5 → セクション共存確認
5. Phase 6 → 品質ゲート通過

---

## Notes

- TDD 必須: テスト記述 → FAIL 確認 → 実装 → PASS 確認の順を厳守する
- `[P]` タスクは異なるファイルを扱うため並列実行可能
- `computeSections` は純粋関数として維持し、テスト容易性を保つ
- `'frequency'` ソートは重い JOIN クエリを伴うため、選択時のみ呼び出すこと
- カテゴリフィルタ選択中に `'muscle'` ソートへ切り替えた場合のフィルタ解除はエッジケース（T012 で対応）
