# Tasks: ホーム画面 StreakCard 固定解除

**Input**: `specs/007-home-streakcard-scroll/`  
**Prerequisites**: spec.md, plan.md, research.md

## Phase 1: Setup

- [x] T001 [US1] Issue #102 の要求を `spec.md` に落とし込む
- [x] T002 [US1] `plan.md / research.md / data-model.md / quickstart.md / contracts/README.md` を作成する

## Phase 2: User Story 1 - StreakCard の固定解除 (P1)

**Goal**: StreakCard が固定表示されずスクロールする

- [x] T003 [US1] Red: `HomeScreen.test.tsx` に「StreakCard が ScrollView 内に配置される」テストを追加する
- [x] T004 [US1] Green: `HomeScreen.tsx` で StreakCard を ScrollView 内の先頭要素へ移動する
- [x] T005 [US1] Refactor: 余白付与の責務を整理し、スクロールコンテンツ構造を明確化する

## Phase 3: User Story 2 - 既存挙動の維持 (P1)

**Goal**: 既存 Home 機能の回帰を防ぐ

- [x] T006 [US2] 既存 HomeScreen テスト（空データ/挨拶非表示/discarded）が通ることを確認する
- [x] T007 [US2] `lint` 実行でエラーが増えていないことを確認する
- [x] T008 [US2] `tsc --noEmit` を PASS させる

## Verification

- [x] V001 `pnpm --filter mobile test -- src/features/home/screens/__tests__/HomeScreen.test.tsx --runInBand` (PASS)
- [x] V002 `pnpm --filter mobile lint` (PASS: warning のみ)
- [x] V003 `pnpm --filter mobile exec tsc --noEmit` (PASS)

## Summary

- 総タスク数: 11
- 完了タスク数: 11
- ユーザーストーリー別タスク数: US1 = 5, US2 = 3
- 並列実行可能タスク数: 0（同一画面・同一テストの逐次更新）
