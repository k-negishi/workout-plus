# Feature Specification: 重複種目防止 + 種目選択UI改善

**Feature Branch**: `20260222-重複種目防止`
**Created**: 2026-02-22
**Status**: Draft
**Input**: GitHub Issue #116 - 1つのワークアウトで種目名を重複して登録できないようにする

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 重複種目の追加を防止する (Priority: P1)

ユーザーが記録中のワークアウトに、すでに追加済みの種目を再度追加しようとした場合に、追加をブロックしてエラーメッセージを表示する。

**Why this priority**: データの整合性を保つ最重要機能。重複登録は記録の信頼性を損ない、UIも混乱する。

**Independent Test**: ExercisePickerScreen またはフックレベルで「既に追加済みの exerciseId を addExercise() に渡してもストアが更新されない」ことをテストできる。

**Acceptance Scenarios**:

1. **Given** ワークアウト記録中で「ベンチプレス」が追加済み, **When** ExercisePicker で「ベンチプレス」を再度タップする, **Then** エラートースト「この種目はすでに追加されています」が表示されワークアウトには追加されない
2. **Given** ワークアウト記録中で「ベンチプレス」が追加済み, **When** multi モードで「ベンチプレス」を選択して「追加」ボタンを押す, **Then** 重複した種目は無視され、未追加の種目のみ追加される
3. **Given** addExercise フックが呼ばれる, **When** currentExercises に同じ exerciseId が既に存在する, **Then** DB INSERT が実行されずストアも更新されない

---

### User Story 2 - 追加済み種目を視覚的に識別できる (Priority: P2)

ExercisePicker 画面で、現在のワークアウトに既に追加されている種目を視覚的に区別（グレーアウト + 「追加済み」バッジ）表示する。

**Why this priority**: ユーザーが重複タップをそもそも行わないよう予防する UX 改善。P1 の防止ロジックと組み合わせることで UX が完結する。

**Independent Test**: ExercisePicker の renderItem が、currentExercises に含まれる exerciseId を持つアイテムに対して「追加済み」バッジを表示することをテストできる。

**Acceptance Scenarios**:

1. **Given** ワークアウト記録中で「ベンチプレス」が追加済み, **When** ExercisePicker を開く, **Then** ベンチプレスの行に「✓ 追加済み」バッジ（グリーン）が表示され、行がグレーアウトされる
2. **Given** 追加済み種目がグレーアウト表示されている, **When** その種目の行をタップする, **Then** 何も起きない（トーストも出さない。視覚的に無効なことが明確なため）
3. **Given** multi モードで追加済み種目が一覧に表示されている, **When** その行をタップしようとする, **Then** チェックが入らず選択状態に遷移しない

---

### Edge Cases

- `currentWorkout` が null の場合（セッション未開始）: addExercise は早期リターンし何も行わない（既存動作を維持）
- multi モードで選択済み種目のうち一部が重複している場合: 重複分を除いた種目のみ追加し、スキップ件数をトーストで通知する
- ワークアウト完了後に同じ種目を別ワークアウトで追加する場合: 問題なし（workoutId スコープで重複チェックするため）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `useWorkoutSession.addExercise()` は、`store.currentExercises` に同じ `exerciseId` が存在する場合、DB INSERT を実行してはならない
- **FR-002**: 重複追加ブロック時、`showErrorToast('この種目はすでに追加されています')` を呼ぶ
- **FR-003**: `ExercisePickerScreen` は `useWorkoutSessionStore` から `currentExercises` を読み取り、追加済み exerciseId セットを構築する
- **FR-004**: ExercisePicker の種目リストで追加済み種目には「追加済み」バッジを表示する（チェックマーク + グレー背景）
- **FR-005**: ExercisePicker で追加済み種目はタップ無効（`disabled` 相当）とし、グレーアウト + 「✓ 追加済み」バッジを表示する。タップしても何も起きない
- **FR-006**: multi モードで追加済み種目が選択肢に含まれていても、未追加の種目のみ `addExercise()` を呼ぶ

### Key Entities

- **WorkoutExercise**: `exerciseId` + `workoutId` の組み合わせが1ワークアウト内で一意となるよう管理する
- **addedExerciseIds**: `currentExercises` から派生した `Set<string>`（exerciseId の集合）。ExercisePicker で追加済み判定に使用する

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 同一 exerciseId で `addExercise()` を2回呼んでも `currentExercises.length` が増加しない（テスト自動確認）
- **SC-002**: ExercisePickerScreen の追加済み種目には「追加済み」バッジが描画される（テスト自動確認）
- **SC-003**: pnpm --filter mobile test が PASS（カバレッジ目標: 関連ファイル 90%+）
- **SC-004**: pnpm lint が PASS（ESLint エラーゼロ）
- **SC-005**: pnpm --filter mobile tsc --noEmit が PASS（型エラーゼロ）
