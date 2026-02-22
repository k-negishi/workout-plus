# Tasks: 編集画面上部重なりバグ修正

**Input**: Design documents from `/specs/20260222-編集画面上部重なりバグ修正/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Organization**: SafeArea バグ修正のシングルストーリー。TDD アプローチで実施。

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: なし（既存プロジェクト、インフラ変更なし）

このフェーズは省略 — 既存スタックの修正のみ。

---

## Phase 2: User Story 1 — 編集画面が正しく表示される (Priority: P1) 🎯 MVP

**Goal**: `WorkoutEditScreen` のヘッダーに SafeArea トップインセットを適用し、
ステータスバー・ノッチとの重なりを解消する。

**Independent Test**: ノッチ付きデバイス（iPhone X 以降）またはシミュレーターで
編集画面を開き、ヘッダーがステータスバーと重ならないことを確認。

### Tests for User Story 1（TDD: Red → Green）

- [x] T001 [US1] `WorkoutEditScreen` のテストを新規作成し、`useSafeAreaInsets` が呼ばれることを検証する `apps/mobile/src/features/workout/screens/__tests__/WorkoutEditScreen.test.tsx`
  - `WorkoutDetailScreen.test.tsx` のモック構成を参考に実装
  - `useSafeAreaInsets` が呼ばれることを `expect(useSafeAreaInsets).toHaveBeenCalled()` で確認
  - テストが **Red（失敗）** であることを確認してから次へ進む

### Implementation for User Story 1

- [x] T002 [US1] `WorkoutEditScreen.tsx` に `useSafeAreaInsets` を追加し、ヘッダーの View に `paddingTop: insets.top` を適用する `apps/mobile/src/features/workout/screens/WorkoutEditScreen.tsx`
  - `import { useSafeAreaInsets } from 'react-native-safe-area-context'` を追加
  - `const insets = useSafeAreaInsets()` をコンポーネント内に追加
  - ヘッダー View に `style={{ paddingTop: insets.top }}` を追加（NativeWind className は維持）
  - T001 のテストが **Green（成功）** になることを確認

**Checkpoint**: テスト通過後、シミュレーターで編集画面を開いてヘッダーの重なりが解消されていることを目視確認

---

## Phase 3: Polish

- [x] T003 [P] 型チェック実行 `pnpm --filter mobile tsc --noEmit`
- [x] T004 [P] Lint 実行 `pnpm lint`（今回変更ファイルはクリーン、既存エラーは別 Issue）
- [x] T005 [P] 全テスト実行 `pnpm --filter mobile test`（204 passed, 26 suites）

---

## Dependencies & Execution Order

- T001 → T002（テストを先に書く）
- T002 完了後に T003/T004/T005 を並列実行

### Parallel Opportunities

```bash
# Phase 3 は並列実行可能
Task: "型チェック"
Task: "Lint"
Task: "全テスト"
```

---

## Implementation Strategy

### MVP（このバグ修正の完了定義）

1. T001: テスト作成（Red）
2. T002: 実装（Green）
3. T003/T004/T005: 品質チェック通過

---

## Notes

- 修正対象は `WorkoutEditScreen.tsx` の 1 箇所のみ
- 参照パターン: `WorkoutDetailScreen.tsx:55` の `useSafeAreaInsets` 実装
- ホームタブ・カレンダータブの双方でこの画面を使うが、コンポーネント自体の修正のみで両方に適用される
