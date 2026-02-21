# Tasks: ホームヘッダー簡素化

**Input**: `specs/006-home-header-cleanup/`  
**Prerequisites**: spec.md, plan.md, research.md

## Phase 1: Setup

- [x] T001 [US1] Issue #105 の要求を `spec.md` に落とし込む
- [x] T002 [US1] `plan.md / research.md / data-model.md / quickstart.md / contracts/README.md` を作成する

## Phase 2: User Story 1 - 不要ヘッダー要素の削除 (P1)

**Goal**: 挨拶文と右上丸アイコンを削除する

- [x] T003 [US1] Red: `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` に「挨拶テキスト非表示」テストを追加する
- [x] T004 [US1] Green: `apps/mobile/src/features/home/screens/HomeScreen.tsx` から挨拶行と丸アイコンを削除する
- [x] T005 [US1] Refactor: 不要になった挨拶ヘルパーとコメントを整理する

## Phase 3: User Story 2 - 上詰め維持 (P1)

**Goal**: StreakCard をヘッダー先頭表示にして間延びを防ぐ

- [x] T006 [US2] `HomeScreen.tsx` で StreakCard がヘッダー先頭要素として表示される構造を維持する
- [x] T007 [US2] `HomeScreen.test.tsx` の既存テストと新規テストを実行し、回帰がないことを確認する

## Verification

- [x] V001 `pnpm --filter mobile test -- src/features/home/screens/__tests__/HomeScreen.test.tsx --runInBand`
- [x] V002 `pnpm --filter mobile lint`
- [x] V003 `pnpm --filter mobile exec tsc --noEmit`

## Summary

- 総タスク数: 10
- ユーザーストーリー別タスク数: US1 = 5, US2 = 2
- 並列実行可能タスク数: 0（同一ファイル更新が中心のため逐次実行）
