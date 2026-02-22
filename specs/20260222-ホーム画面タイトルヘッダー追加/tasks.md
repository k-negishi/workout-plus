# Tasks: ホーム画面タイトルヘッダー追加

**Input**: Design documents from `/specs/20260222-ホーム画面タイトルヘッダー追加/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅

**Organization**: ユーザーストーリーごとにフェーズを分け、各フェーズを独立してテスト可能にする。
**TDD 必須**: CLAUDE.md 規約に従い、実装コードの前にテストを記述してから実装する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存タスクなし）
- **[Story]**: ユーザーストーリー（US1, US2）
- 各タスクに正確なファイルパスを含める

---

## Phase 1: Setup

**Purpose**: 作業前の確認と前提条件の整備

- [x] T001 ブランチが `20260222-ホーム画面タイトルヘッダー追加` であることを確認し、作業対象ファイル 2 件を確認する (`apps/mobile/src/features/home/screens/HomeScreen.tsx`, `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx`)

---

## Phase 2: Foundation（ブロッキング前提条件）

**Purpose**: US1/US2 のテストが Ionicons アイコンのレンダリングでクラッシュしないよう、テストファイルにモックを追加する

**⚠️ CRITICAL**: このフェーズ完了前にユーザーストーリー実装を開始してはならない

- [x] T002 `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` に `@expo/vector-icons` の jest モックを追加する（Ionicons を displayName 付きシンプルコンポーネントに差し替え、既存の `react-native-svg` モックと同様のパターンで）

**Checkpoint**: `pnpm --filter mobile test HomeScreen` がモック追加後もエラーなく実行できること

---

## Phase 3: User Story 1 - ホームトップでアプリタイトルを確認する (Priority: P1) 🎯 MVP

**Goal**: ホーム画面最上部に "Workout+" テキストがスクロールコンテンツとして表示される

**Independent Test**: `getByText('Workout+')` が ScrollView 内に存在すること、および下スクロール後はタイトルが固定されないこと（ScrollView 内配置であることをコード構造で確認）

### Tests for User Story 1 ⚠️ 先に書いて FAIL を確認すること

- [x] T003 [US1] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` に describe `'HomeScreen タイトルヘッダー'` を追加し、`'Workout+ タイトルが ScrollView 内に表示される'` テストを記述する（`queryByText('Workout+')` が `not.toBeNull()` になることをアサート）
- [x] T004 [US1] T003 のテストを実行して **FAIL** することを確認する (`pnpm --filter mobile test HomeScreen`)

### Implementation for User Story 1

- [x] T005 [US1] `apps/mobile/src/features/home/screens/HomeScreen.tsx` に `TouchableOpacity` を `react-native` からインポートし、`Ionicons` を `@expo/vector-icons` からインポートする
- [x] T006 [US1] `apps/mobile/src/features/home/screens/HomeScreen.tsx` の白背景ヘッダー `<View>` 先頭（StreakCard の直前）に、タイトル行 `<View>` を追加する。左側に `<Text>Workout+</Text>`（fontSize:20, fontWeight:'700', color:colors.primary）を配置し、marginBottom:16 でStreakCardと間隔を取る
- [x] T007 [US1] T003 のテストを再実行して **PASS** することを確認する

**Checkpoint**: この時点で "Workout+" テキストがホーム画面に表示されること。`pnpm --filter mobile test HomeScreen` が通ること

---

## Phase 4: User Story 2 - 設定ボタンをタップして設定にアクセスする (Priority: P2)

**Goal**: タイトル行右側に設定アイコンボタンが表示される（タップ時アクションなし、将来対応）

**Independent Test**: `getByTestId('settings-button')` が存在すること

### Tests for User Story 2 ⚠️ 先に書いて FAIL を確認すること

- [x] T008 [US2] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` の `'HomeScreen タイトルヘッダー'` describe に `'設定ボタンが表示される (testID: settings-button)'` テストを追加する（`getByTestId('settings-button')` が存在することをアサート）
- [x] T009 [US2] T008 のテストを実行して **FAIL** することを確認する

### Implementation for User Story 2

- [x] T010 [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` のタイトル行 `<View>` 内右側に `<TouchableOpacity testID="settings-button" accessibilityLabel="設定" style={{ padding: 8 }}>` を追加し、内部に `<Ionicons name="settings-outline" size={22} color={colors.textSecondary} />` を配置する。`onPress` は未実装（将来対応のコメントを付与）
- [x] T011 [US2] T008 のテストを再実行して **PASS** することを確認する

**Checkpoint**: この時点でタイトルと設定ボタンが共に表示されること。`pnpm --filter mobile test HomeScreen` が全テスト通ること

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 品質チェックと最終確認

- [x] T012 `pnpm --filter mobile test --coverage` でテストカバレッジが 90% 以上であることを確認する（全185テスト PASS、98.43% branches / 100% lines）
- [x] T013 [P] `pnpm --filter mobile tsc --noEmit` で型エラーがないことを確認する（既存エラーのみ・今回の変更起因なし）
- [x] T014 [P] `pnpm lint` で ESLint エラーがないことを確認する（今回の変更起因エラーなし・既存 complexity error は TimerBar.tsx の既存問題）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundation (Phase 2)**: Phase 1 完了後 — **US1/US2 のテストをブロック**
- **User Story 1 (Phase 3)**: Phase 2 完了後 — US2 とは同ファイルだが独立して完結可能
- **User Story 2 (Phase 4)**: Phase 3 完了後 — タイトル行が存在する前提で設定ボタンを追加
- **Polish (Phase 5)**: Phase 4 完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に開始可能
- **US2 (P2)**: Phase 3（US1）完了後に開始。タイトル行 `<View>` の中に設定ボタンを追加するため、US1 の実装が必要

### Within Each User Story

1. **テストを書く** → FAIL を確認
2. **実装する** → PASS を確認
3. 次のストーリーへ

### Parallel Opportunities

- T013（tsc）と T014（lint）は並列実行可能 `[P]`
- T003 と T004（テスト記述・確認）は連続実行が必要

---

## Parallel Example: Phase 5

```bash
# T013 と T014 を並列起動
Task: "pnpm --filter mobile tsc --noEmit"
Task: "pnpm lint"
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup（確認）
2. Phase 2: Foundation（Ionicons モック追加）
3. Phase 3: User Story 1（"Workout+" タイトル表示）
4. **STOP and VALIDATE**: `Workout+` がホーム画面に表示されることを確認
5. 必要に応じてデモ可能

### Incremental Delivery

1. Setup + Foundation → テスト環境準備完了
2. US1 → "Workout+" タイトル表示 → 検証（MVP!）
3. US2 → 設定ボタン追加 → 検証
4. Polish → 品質チェック完了

---

## Notes

- TDD 必須: テストが FAIL することを確認してから実装する（CLAUDE.md 規約）
- `@expo/vector-icons` は Expo SDK 組み込み。`package.json` への追加は不要
- `TouchableOpacity` の `onPress` は意図的に未実装（将来対応）。コードコメントで明示すること
- `testID` は React Native テストのベストプラクティス
