# Tasks: 設定画面

**Input**: Design documents from `specs/20260301-設定画面/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: TDD 必須（CLAUDE.md規定）。各実装前にテストを先行作成（Red → Green → Refactor）

**Organization**: フェーズ2（基盤）→ フェーズ3（US3: ナビゲーション/画面シェル）→ フェーズ4（US1: 週の目標）→ フェーズ5（US2: 招待コード）→ フェーズ6（仕上げ）

> **注意**: US3（P3）はUI基盤として US1・US2 に先行実装が必要なため、フェーズ3で先行する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: セットアップ

**Purpose**: 既存プロジェクトへの追加設定（新規初期化なし）

- [ ] T001 `apps/mobile/.env.local` と `apps/mobile/.env.example` に `EXPO_PUBLIC_INVITE_CODE` を追加

---

## Phase 2: Foundational（ブロッキング基盤）

**Purpose**: 全ユーザーストーリーが依存する DB レイヤーと型定義

**⚠️ CRITICAL**: このフェーズ完了前にユーザーストーリーの実装は開始しない

- [ ] T002 `apps/mobile/src/database/types.ts` に `UserSettingsRow`・`UserSettings` 型を追加
- [ ] T003 `apps/mobile/src/database/repositories/__tests__/userSettings.test.ts` を作成して `UserSettingsRepository` の全メソッドのテストを Red 状態で書く（get / setWeeklyGoalCount / setInviteCodeUnlocked）
- [ ] T004 `apps/mobile/src/database/migrations.ts` に `migrateV7ToV8`（`user_settings` テーブル作成 + `INSERT OR IGNORE` 初期行）を追加し、`LATEST_VERSION` を 8 に更新、`MIGRATIONS` に `8: migrateV7ToV8` を追記する
- [ ] T005 `apps/mobile/src/database/repositories/userSettings.ts` を作成して `UserSettingsRepository`（`get` / `setWeeklyGoalCount` / `setInviteCodeUnlocked`）を実装し、T003 のテストを Green にする
- [ ] T006 `apps/mobile/src/types/navigation.ts` の `MainTabParamList` に `SettingsTab: undefined` を追加する

**Checkpoint**: `pnpm --filter mobile test -- --testPathPattern=userSettings` が Green 。基盤準備完了。

---

## Phase 3: User Story 3 - 設定画面を閲覧する (Priority: P3) 🏗️ UI Shell

> **実装優先度の逆転理由**: US3（P3）はナビゲーションとスクリーンの雛形を提供するため、US1/US2 より先に実装する必要がある。

**Goal**: タブバーの歯車アイコンから設定画面が開き、全セクション（ワークアウト・招待コード・データ管理・その他）がWFに準拠して表示される。データ管理・利用規約・プライバシーポリシーは「準備中」バッジで非活性。

**Independent Test**: タブバー右端の歯車アイコンをタップ → 「設定」画面が表示され、全セクションとアイテムが確認できる。データインポート行・データエクスポート行・利用規約行・プライバシーポリシー行がタップ不可。

### Tests for User Story 3（TDD: 先行 Red）

- [ ] T007 [US3] `apps/mobile/src/features/settings/screens/__tests__/SettingsScreen.test.tsx` を作成して、基本レイアウト（全セクション・アイテムの存在・「準備中」バッジの非活性）のテストを Red 状態で書く

### Implementation for User Story 3

- [ ] T008 [US3] `apps/mobile/src/features/settings/screens/SettingsScreen.tsx` を新規作成する（ヘッダー「設定」タイトル・ワークアウトセクション・招待コード行・データ管理セクション（準備中）・その他セクション（準備中）の全レイアウト）。T007 のテストを Green にする
- [ ] T009 [US3] `apps/mobile/src/app/MainTabs.tsx` に `SettingsTab` の `Tab.Screen`（歯車アイコン・ラベル「設定」）を追加して5タブ構成にする

**Checkpoint**: `pnpm --filter mobile test -- --testPathPattern=SettingsScreen` が Green 。タブから設定画面が開くことを Expo Go で確認。

---

## Phase 4: User Story 1 - 週の目標を設定してホームで進捗確認 (Priority: P1) 🎯 MVP

**Goal**: 設定画面の `[−] N回 [+]` ステッパーで週の目標回数（1〜7）を変更でき、変更がホーム画面の「今週 X / N 回」に即座に反映される。アプリ再起動後も設定値が保持される。

**Independent Test**: `[+]` を 2 回タップして目標を 5 回に変更 → ホーム画面に戻ると「X / 5 回」と表示される。アプリ再起動後も設定画面が「5 回」を表示している。

### Tests for User Story 1（TDD: 先行 Red）

- [ ] T010 [P] [US1] `apps/mobile/src/features/settings/screens/__tests__/SettingsScreen.test.tsx` に週の目標ステッパーのテストを追加（`[+]` / `[−]` タップで回数変更・境界値非活性・UserSettingsRepository 呼び出し確認）。Red 状態で追加。
- [ ] T011 [P] [US1] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` に `targetWorkouts` prop が `UserSettingsRepository` から取得した値で渡されることのテストを追加。Red 状態で追加。

### Implementation for User Story 1

- [ ] T012 [P] [US1] `apps/mobile/src/features/settings/screens/SettingsScreen.tsx` に週の目標ステッパー（`[−] N回 [+]`）を実装する。`UserSettingsRepository.setWeeklyGoalCount()` で即時保存。`count === 1` で `[−]` 非活性、`count === 7` で `[+]` 非活性（FR-017）。T010 のテストを Green にする。
- [ ] T013 [P] [US1] `apps/mobile/src/features/home/screens/HomeScreen.tsx` を更新する：①設定アイコンボタン（L374-381）を削除（FR-020）、② `useFocusEffect` で `UserSettingsRepository.get()` を呼び出し `weeklyGoalCount` を取得、③ `<WeeklyGoalsWidget targetWorkouts={weeklyGoalCount} />` を渡す。T011 のテストを Green にする。

**Checkpoint**: `pnpm --filter mobile test -- --testPathPattern="SettingsScreen|HomeScreen"` が Green 。MVP 動作確認完了。

---

## Phase 5: User Story 2 - 招待コードを入力して限定機能を解禁 (Priority: P2)

**Goal**: 設定画面の「招待コード」行をタップするとフォームが展開し、有効なコードを入力して「適用」を押すと解禁フラグが保存される。再起動後も「解禁済み」バッジが表示される。無効コードはエラーメッセージを表示。

**Independent Test**: 有効なコードを入力して「適用」→「限定機能が解禁されました」が表示 → アプリ再起動後も「解禁済み」バッジが表示されている。

### Tests for User Story 2（TDD: 先行 Red）

- [ ] T014 [P] [US2] `apps/mobile/src/features/settings/utils/__tests__/inviteCode.test.ts` を作成して `validateInviteCode` のテスト（有効・無効・空文字・前後スペースのトリム）を Red 状態で書く
- [ ] T015 [P] [US2] `apps/mobile/src/features/settings/screens/__tests__/SettingsScreen.test.tsx` に招待コード UI のテストを追加（フォーム展開・有効コード適用・無効コードエラー・空欄ボタン非活性・解禁済みバッジ表示）。Red 状態で追加。

### Implementation for User Story 2

- [ ] T016 [US2] `apps/mobile/src/features/settings/utils/inviteCode.ts` を作成して `validateInviteCode(input: string): boolean` を実装する（`process.env.EXPO_PUBLIC_INVITE_CODE` と `input.trim()` を比較）。T014 のテストを Green にする。
- [ ] T017 [US2] `apps/mobile/src/features/settings/screens/SettingsScreen.tsx` に招待コード UI を実装する（アコーディオン展開・TextInput・「適用」ボタン・有効時はフォーム下にインラインテキスト「✓ 限定機能が解禁されました」を表示して解禁済みバッジに切り替え・無効時エラーテキスト「コードが正しくありません」・空欄時ボタン非活性）。T015 のテストを Green にする。

**Checkpoint**: `pnpm --filter mobile test -- --testPathPattern="SettingsScreen|inviteCode"` が Green 。招待コードの解禁フローを Expo Go で確認。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 品質チェック・仕上げ

- [ ] T018 [P] `pnpm --filter mobile tsc --noEmit` を実行して型エラーがゼロであることを確認する
- [ ] T019 [P] `pnpm lint` を実行して ESLint エラーがゼロであることを確認する
- [ ] T020 `pnpm --filter mobile test --coverage` を実行してカバレッジ 90%+ を確認する（不足があれば追加テストを作成）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: 依存なし。即座に開始可能
- **Phase 2（Foundational）**: Phase 1 完了後。全ユーザーストーリーをブロック
- **Phase 3（US3）**: Phase 2 完了後。US1・US2 のためのUI基盤
- **Phase 4（US1 - P1）**: Phase 2・Phase 3 完了後（SettingsScreen が存在することが前提）
- **Phase 5（US2 - P2）**: Phase 2・Phase 3 完了後（US1 と独立して実装可能）
- **Phase 6（Polish）**: 全ユーザーストーリー完了後

### User Story Dependencies

- **US3（P3 だが先行必須）**: Phase 2 完了後に開始。US1・US2 のスクリーン基盤
- **US1（P1 - MVP）**: Phase 2・US3 完了後に開始
- **US2（P2）**: Phase 2・US3 完了後に開始（US1 と並列可能）

### Within Each User Story

- テスト（Red）→ 実装（Green）の順（TDD 厳守）
- T010 と T011 は並列可能（異なるファイルへのテスト追加）
- T012 と T013 は並列可能（異なるファイルへの実装）
- T014 と T015 は並列可能（異なるファイルへのテスト追加）

---

## Parallel Example: User Story 1

```bash
# テスト追加（並列可能）:
T010: SettingsScreen のステッパーテスト追加
T011: HomeScreen の targetWorkouts テスト追加

# 実装（並列可能、テスト完了後）:
T012: SettingsScreen にステッパー実装
T013: HomeScreen 更新（設定アイコン削除 + targetWorkouts + useFocusEffect）
```

## Parallel Example: User Story 2

```bash
# テスト追加（並列可能）:
T014: inviteCode.test.ts 作成
T015: SettingsScreen 招待コードテスト追加

# 実装（並列可能、テスト完了後）:
T016: inviteCode.ts 作成
T017: SettingsScreen 招待コード UI 実装
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. Phase 1: Setup（T001）
2. Phase 2: Foundational（T002〜T006）
3. Phase 3: US3 Shell（T007〜T009）
4. Phase 4: US1（T010〜T013）
5. **STOP & VALIDATE**: 週の目標が設定・保存・ホーム反映できることを確認
6. デプロイ/デモ可能

### Incremental Delivery

1. Phase 1 + 2 → DB・型基盤準備完了
2. Phase 3 → 設定画面のシェル表示
3. Phase 4（US1）→ 週の目標機能 → **MVP デリバリー**
4. Phase 5（US2）→ 招待コード機能追加
5. Phase 6 → 品質確認・完成

---

## Summary

| 項目 | 内容 |
|---|---|
| 総タスク数 | 20 タスク |
| Phase 1 (Setup) | 1 タスク |
| Phase 2 (Foundational) | 5 タスク |
| Phase 3 (US3 Shell) | 3 タスク |
| Phase 4 (US1 - P1) | 4 タスク |
| Phase 5 (US2 - P2) | 4 タスク |
| Phase 6 (Polish) | 3 タスク |
| 並列実行可能 | T010/T011、T012/T013、T014/T015、T016/T017、T018/T019 |
| TDD 必須 | 全ユーザーストーリーフェーズでテスト先行（Red → Green） |

## Notes

- [P] タスク = 異なるファイル・依存関係なしで並列実行可能
- TDD: テストが Red（失敗）であることを確認してから実装する
- 各フェーズの Checkpoint でテストを実行して Green を確認してから次へ進む
- `pnpm --filter mobile tsc --noEmit` で型チェックを定期的に実行する
- `pnpm lint` で ESLint エラーがゼロであることをコミット前に確認する
