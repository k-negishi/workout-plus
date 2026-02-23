# Tasks: 登録画面改善

**Input**: Design documents from `/specs/20260223-登録画面改善/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**実装方針**: TDD必須（Red → Green → Refactor）。DBスキーマ変更なし。セットアップフェーズ・基盤フェーズは不要（既存コードのバグ修正のみ）。

---

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: ユーザーストーリーラベル（US1, US2, US3）

---

## Phase 1: User Story 1 - 別日セッション開始時の入力状態リセット (Priority: P1)

**Goal**: `targetDate` 指定でセッション開始したとき、別日の recording ワークアウトが復元されない

**Independent Test**: カレンダーから異なる日付を選択してRecordScreenを開き、前日の入力が表示されないことを確認

**根本原因**: `startSession({ targetDate })` 時に `findRecording()` が呼ばれ、日付に関わらず既存の `recording` ワークアウトを復元してしまう

- [x] T001 [US1] `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.test.ts` に `startSession-targetDate指定` テストを追加（Red: `findRecording()` が呼ばれて既存セッションが復元される現象を再現するテスト）
- [x] T002 [US1] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` の `startSession()` を修正: `if (!targetDate)` 条件を `findRecording()` 呼び出し前に追加（Green）
- [x] T003 [US1] T001のテストが通ることを確認し、必要に応じてリファクタリング（Refactor）

---

## Phase 2: User Story 2 - タイマーボタンの文言・UX改善 (Priority: P2)

**Goal**: タイマーバーの終了ボタンが「終了」と表示され、データ保存タイミングの誤解がない

**Independent Test**: RecordScreenを開き、TimerBarの右端ボタンが「終了」と表示されることを確認

**根本原因**: `TimerBar.tsx` の ボタン文言が「完了」でリアルタイム保存を示唆していない

- [x] T004 [US2] `apps/mobile/src/features/workout/components/__tests__/TimerBar.test.tsx` に TimerBar のボタン文言テストを追加（「終了」が表示されることを期待するテスト = Red）
- [x] T005 [US2] `apps/mobile/src/features/workout/components/TimerBar.tsx` のボタン文言を「完了」→「終了」に変更、`accessibilityLabel` も「ワークアウトを終了」に更新（Green）

---

## Phase 3: User Story 3 - 前回セット日付整合性改善 (Priority: P3)

**Goal**: 前回セット表示が「現在のセッション日付以前」の直近レコードのみを参照する

**Independent Test**: 1/10・1/15・1/20にスクワット記録がある状態で、1/15のワークアウトを編集すると「前回セット」が1/10のデータになる

**根本原因**: `usePreviousRecord` の SQL が日付フィルタなし（`ORDER BY created_at DESC` のみ）

- [x] T006 [US3] `apps/mobile/src/features/workout/hooks/__tests__/usePreviousRecord.test.ts` に日付フィルタのテストを追加（`currentWorkoutCreatedAt < target_date` のワークアウトが「前回」に来ないことを確認 = Red）
- [x] T007 [US3] `apps/mobile/src/features/workout/hooks/usePreviousRecord.ts` を修正: 引数に `currentWorkoutCreatedAt: number | null` を追加し、SQLに `AND w.created_at < ?` 条件を追加（Green）
- [x] T008 [US3] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` の `ExerciseBlockWithPrevious` コンポーネントに `currentWorkoutCreatedAt` プロップを追加し、`usePreviousRecord` に `store.currentWorkout?.createdAt ?? null` を渡す（Green継続）
- [x] T009 [US3] T006のテストが通ることを確認し、必要に応じてリファクタリング（Refactor）

---

## Phase 4: 仕上げ & 横断的品質チェック

- [x] T010 `pnpm --filter mobile tsc --noEmit` で型チェックを実施し、エラーがないことを確認（既存エラー: useAIChat.ts のみ・本件無関係）
- [x] T011 `pnpm --filter mobile test --coverage` で全テストを実行してカバレッジ90%+を確認し、既存テストを含めてすべてパスすることを確認（AI feature・SetRow は既存失敗）
- [x] T012 `pnpm lint` で Lint を実施し、エラーがないことを確認（変更ファイルはエラーゼロ）
- [ ] T013 [P] 修正3点（Bug1/2/3）を実機またはシミュレーターで動作確認し、再現手順通りに問題が解消されたことを確認

---

## 依存関係グラフ

```
T001 → T002 → T003       (US1: データ保持)
T004 → T005              (US2: タイマー文言)
T006 → T007 → T008 → T009  (US3: 前回セット)

T003 ┐
T005 ├→ T010 → T011 → T012 → T013
T009 ┘
```

**並列実行の機会**:
- US1 / US2 / US3 は互いに独立: T001〜T003、T004〜T005、T006〜T009 を並列実行可能
- T010（型チェック）: 全実装完了後

---

## 実装戦略

| 優先度 | バグ | ファイル | 変更規模 |
|--------|------|----------|----------|
| P1 | startSession の findRecording スキップ | useWorkoutSession.ts | 条件文1行 |
| P2 | TimerBar 文言変更 | TimerBar.tsx | テキスト2箇所 |
| P3 | usePreviousRecord 日付フィルタ | usePreviousRecord.ts + RecordScreen.tsx | 引数1 + SQL条件1 + props転送 |

**MVP**: P1（US1）のみで「別日データ混入」という最重要問題を解消できる。P2・P3は独立して追加可能。

**総タスク数**: 13タスク
**各ストーリーのタスク数**: US1: 3タスク、US2: 2タスク、US3: 4タスク、仕上げ: 4タスク
**並列実行可能**: US1〜US3は同時進行可（異なるファイル）
