# Tasks: ワークアウト記録コア画面

**Input**: Design documents from `/specs/001-workout-core-screens/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: ユーザーストーリー優先度順（P1→P2→P3）。各ストーリーは独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US7）
- 各タスクには正確なファイルパスを含む

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: モノレポ初期化・開発ツール設定。全フェーズの前提。

- [ ] T001 `apps/mobile/` を `npx create-expo-app` で作成し TypeScript テンプレートを適用。`pnpm-workspace.yaml`・`turbo.json` を配置してモノレポ構成を確立する
- [ ] T002 `apps/mobile/tsconfig.json` に strict mode + `noUncheckedIndexedAccess`・`noImplicitOverride`・`exactOptionalPropertyTypes`・`noPropertyAccessFromIndexSignature` を追加する
- [ ] T003 [P] `apps/mobile/eslint.config.mjs` に flat config を作成する（@typescript-eslint/strict-type-checked、eslint-plugin-react-native、simple-import-sort、sonarjs、jest、testing-library）
- [ ] T004 [P] `apps/mobile/.prettierrc` を作成する（printWidth:100、singleQuote:true、trailingComma:"all"）
- [ ] T005 `.husky/pre-commit` + `apps/mobile/package.json` に lint-staged 設定を追加し、`commitlint.config.js` で conventional commits を強制する
- [ ] T006 [P] `apps/mobile/jest.config.ts` を作成する（RNTL、カバレッジ閾値 90%、jest-expo プリセット）
- [ ] T007 [P] `packages/shared/` ディレクトリを作成し `packages/shared/package.json` を初期化する（将来のAPI型共有用スタブ）
- [ ] T008 [P] `.github/workflows/ci.yml` を作成する（lint・format:check・test --coverage の3ジョブ、path filter: apps/mobile/**）
- [ ] T069 [P] `apps/mobile/babel.config.js`・`tailwind.config.js`・`nativewind-env.d.ts` を作成し NativeWind v4 をセットアップする（`metro.config.js` のトランスフォーム設定含む）

**Checkpoint**: `pnpm --filter mobile lint`・`pnpm --filter mobile test` がゼロエラーで通過すること

---

## Phase 2: Foundational（データ層 + ナビゲーション基盤）

**Purpose**: 全ユーザーストーリーが依存するブロッキング前提条件。このフェーズ完了後に US フェーズを開始する。

**⚠️ CRITICAL**: このフェーズ完了まで US フェーズは開始不可

### データ層

- [ ] T009 `apps/mobile/src/database/client.ts` に `openDatabaseAsync` + WALモード有効化 + DB シングルトンを実装する
- [ ] T010 `apps/mobile/src/database/schema.ts` に DDL（exercises・workouts・workout_exercises・sets・personal_records + 全インデックス）を定義する
- [ ] T011 `apps/mobile/src/database/migrations.ts` に `PRAGMA user_version` ベースのマイグレーション基盤を実装する（`withTransactionAsync` で原子実行）
- [ ] T012 [P] `apps/mobile/src/database/seed.ts` にプリセット種目シード（7部位 × 5〜10種目、合計約50種目）を実装する
- [ ] T013 [P] `apps/mobile/src/database/repositories/workout.ts` に WorkoutRepository を実装する（CRUD + status フィルタ + recording 取得）
- [ ] T014 [P] `apps/mobile/src/database/repositories/exercise.ts` に ExerciseRepository を実装する（CRUD + お気に入り + カスタム + カテゴリ検索）
- [ ] T015 [P] `apps/mobile/src/database/repositories/set.ts` に SetRepository を実装する（CRUD + workout_exercise_id フィルタ）
- [ ] T016 [P] `apps/mobile/src/database/repositories/pr.ts` に PersonalRecordRepository を実装する（UPSERT + 全履歴再計算クエリ）
- [ ] T017 `apps/mobile/src/database/types.ts` に DB 行型（WorkoutRow・ExerciseRow・SetRow・PRRow）を定義する（DB層は snake_case カラム名、アプリ層型は camelCase — Repository 層で変換する）

### 状態管理

- [ ] T018 [P] `apps/mobile/src/stores/workoutSessionStore.ts` に workoutSessionStore（Zustand）を実装する（タイマー状態・進行中ワークアウト・invalidation counter）
- [ ] T019 [P] `apps/mobile/src/stores/exerciseStore.ts` に exerciseStore（Zustand）を実装する（種目リスト・お気に入り・カスタム・invalidation counter）
- [ ] T020 [P] `apps/mobile/src/stores/uiStore.ts` に uiStore（Zustand）を実装する（モーダル表示状態・ローディング）

### 共通 UI 基盤

- [ ] T021 [P] `apps/mobile/src/shared/constants/colors.ts`・`spacing.ts`・`typography.ts` にデザイントークンを定義する（v1_light カラー、4px グリッド、Noto Sans JP）
- [ ] T022 [P] `apps/mobile/src/shared/components/` に共通 UI コンポーネントを実装する（Button・Card・NumericInput・EmptyState）
- [ ] T023 [P] `apps/mobile/src/shared/components/` に ConfirmDialog・Toast（burnt ラッパー）を実装する
- [ ] T024 `apps/mobile/src/app/RootNavigator.tsx`・`MainTabs.tsx`・`HomeStack.tsx`・`CalendarStack.tsx`・`RecordStack.tsx` を作成し React Navigation 7 のナビゲーション構造を確立する（型定義含む）
- [ ] T025 `apps/mobile/src/types/navigation.ts`・`workout.ts`・`exercise.ts`・`pr.ts` に TypeScript 型定義を作成する

**Checkpoint**: アプリが起動し、タブナビゲーションが動作し、SQLite スキーマが作成されること

---

## Phase 3: US1 — ワークアウトの記録（Priority: P1）🎯 MVP

**Goal**: ジムでリアルタイムにワークアウトを記録し、完了後にサマリーを確認できる

**Independent Test**: ホーム画面「+」→ 種目追加 → セット入力（重量・レップ数） → 完了 → サマリー確認 → ホームに最近のワークアウトが表示される

### Implementation for User Story 1

- [ ] T026 [P] [US1] `apps/mobile/src/features/workout/hooks/useTimer.ts` を実装する（notStarted/running/paused 状態遷移・AppState バックグラウンド復帰対応・elapsedSeconds 正確算出）
- [ ] T027 [P] [US1] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` を実装する（セッション開始・種目追加・完了・WorkoutRepository/workoutSessionStore 連携。下書き保存は T042 で実装）
- [ ] T028 [P] [US1] `apps/mobile/src/features/workout/hooks/usePreviousRecord.ts` を実装する（種目ごとの前回記録取得、別日含む最新ワークアウトから）
- [ ] T029 [P] [US1] `apps/mobile/src/features/workout/utils/calculate1RM.ts` に Epley 式（weight × (1 + reps/30)）と calculateVolume を実装する
- [ ] T030 [US1] `apps/mobile/src/features/workout/components/TimerBar.tsx` を実装する（経過時間表示・開始/停止ボタン・「×」中止ボタン）
- [ ] T031 [US1] `apps/mobile/src/features/workout/components/SetRow.tsx` を実装する（重量/レップ入力・推定1RM表示・前回記録インライン表示・コピーボタン・削除ボタン）
- [ ] T032 [US1] `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` を実装する（種目ヘッダー・前回Nセットバッジ・一括コピー・セット一覧・「+セット追加」ボタン）
- [ ] T033 [US1] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` を実装する（TimerBar・ExerciseBlock 一覧・「種目を追加」ボタン・「完了」ボタン、種目0件時は完了ボタン無効）
- [ ] T034 [US1] `apps/mobile/src/features/exercise/hooks/useExerciseSearch.ts` を実装する（リアルタイムフィルタリング・カテゴリフィルタ・お気に入り/マイ種目/カテゴリ別セクション）
- [ ] T035 [US1] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` を実装する（SearchBar・CategoryTabs・種目リスト・単一選択モード・カスタム種目作成インラインフォーム）
- [ ] T036 [US1] `apps/mobile/src/features/workout/screens/WorkoutSummaryScreen.tsx` を実装する（総ボリューム・種目数・セット数・所要時間・ストリーク・PR ハイライト（NEWバッジ）・種目別サマリー・「ホームに戻る」ボタン）
- [ ] T070 [P] [US1] `apps/mobile/src/features/workout/hooks/__tests__/` に useTimer・useWorkoutSession・usePreviousRecord・calculate1RM のユニットテストを実装する（正常系・異常系・バックグラウンド復帰ケース含む）

**Checkpoint**: 「+」→ 種目選択 → セット入力 → 完了 → サマリーの一連フローが手動検証可能

---

## Phase 4: US5/US6/US2 — 種目管理・記録操作・閲覧編集（Priority: P2）

### US5 — 種目の選択と管理

**Goal**: お気に入り管理・複数選択・カスタム種目の作成・編集ができる

**Independent Test**: 種目選択モーダルでお気に入り切り替え・複数選択・カスタム種目作成が動作し、記録画面に反映される

- [ ] T037 [P] [US5] `apps/mobile/src/features/exercise/components/ExerciseListItem.tsx` にお気に入りトグル（★ボタン）を実装し ExerciseRepository.toggleFavorite と連携する
- [ ] T038 [P] [US5] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` に複数選択モード（チェックボックス・「N種目を追加」ボタン）を追加する
- [ ] T039 [US5] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` にカスタム種目編集フォーム（ペンアイコン → 名前/部位/器具の編集）を追加する

**Checkpoint**: 複数選択・お気に入り・カスタム編集が動作すること

### US6 — ワークアウト記録中の操作

**Goal**: セット追加/削除・タイマー操作・メモ入力・下書き保存・破棄ダイアログが動作する

**Independent Test**: 記録画面でセット追加/削除（番号振り直し確認）・タイマー停止/再開・メモ保存・タブ離脱→戻り（データ保持）・「×」→破棄確認→破棄が動作する

- [ ] T040 [P] [US6] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` にセット追加/削除（set_number 振り直し）ロジックを追加する
- [ ] T041 [P] [US6] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` に種目メモ・ワークアウトメモ入力欄を追加する（FR-010）
- [ ] T042 [US6] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` に下書き保存ロジックを実装する（AppState 変化時・タブナビゲーション時、種目1件以上の場合のみ保存）
- [ ] T043 [US6] `apps/mobile/src/features/workout/components/FloatingRecordBar.tsx` を実装する（recording 中のみ MainTabs に表示・RecordScreen へのショートカット）
- [ ] T044 [US6] `apps/mobile/App.tsx` の起動時に recording 状態の Workout を復帰する処理（workoutSessionStore 初期化）を実装する

**Checkpoint**: 下書き保存・タブ離脱/復帰・破棄フローが動作すること

### US2 — 過去のワークアウト閲覧・編集

**Goal**: 過去のワークアウトを詳細閲覧し、セット値・種目を編集・保存できる

**Independent Test**: ホームの最近ワークアウトカード → 詳細画面 → 編集 → 値変更 → 保存 → 詳細に反映される。キャンセル時に破棄確認ダイアログが表示される

- [ ] T045 [P] [US2] `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` を実装する（種目/セット/ボリューム/所要時間の読み取り専用表示・「編集」ボタン・「削除」ボタン）
- [ ] T046 [US2] `apps/mobile/src/features/workout/screens/WorkoutEditScreen.tsx` を実装する（セット値変更・セット追加/削除・種目追加/削除・「保存」「キャンセル」ボタン）
- [ ] T047 [US2] `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` に編集保存ロジックを追加する（PR 再計算 ← PersonalRecordRepository.recalculateForExercise）
- [ ] T048 [US2] DiscardDialog（透過モーダル）を `apps/mobile/src/app/RootNavigator.tsx` に登録し、RecordScreen・WorkoutEditScreen の両方から呼び出せるようにする
- [ ] T049 [US2] ワークアウト削除確認ダイアログ（「この操作は取り消せません」）を WorkoutDetailScreen に追加し、削除後ホームに遷移する処理を実装する
- [ ] T071 [P] `apps/mobile/src/features/exercise/` と `apps/mobile/src/features/workout/` の Phase 4 対応ロジック（useExerciseSearch・下書き保存・PR再計算・WorkoutRepository.delete）のユニットテストを実装する

**Checkpoint**: US1〜US6 が全て独立動作すること

---

## Phase 5: US7/US3/US4 — ホーム・カレンダー・種目履歴（Priority: P3）

### US7 — ホーム画面ダッシュボード

**Goal**: アプリ起動時にトレーニング状況の概要が一目で把握できる

**Independent Test**: ホーム画面にストリークカード・週間カレンダー・最近3件・クイック統計が表示され、ワークアウトカードタップで詳細画面に遷移する

- [ ] T050 [P] [US7] `apps/mobile/src/features/home/components/StreakCard.tsx` を実装する（今月のトレーニング日数・週間カレンダー（月〜日）・チェックマーク/空丸）
- [ ] T051 [P] [US7] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` を実装する（日時・種目数・ボリューム・時間・ハイライト・タップで詳細遷移）
- [ ] T052 [P] [US7] `apps/mobile/src/features/home/components/QuickStatsWidget.tsx` を実装する（2×2グリッド: 今月目標・次回予定・月間記録・総負荷量）
- [ ] T053 [US7] `apps/mobile/src/features/home/screens/HomeScreen.tsx` を実装する（時間帯別挨拶・StreakCard・週間目標エリア（プレースホルダー）・最近3件・QuickStats・空状態メッセージ）

**Checkpoint**: ホーム画面の全ウィジェットが実データで表示されること

### US3 — カレンダーでの履歴確認

**Goal**: 月別カレンダーで過去のトレーニング日を確認し、日付タップでサマリーを表示できる

**Independent Test**: カレンダー画面を開き、ドットマーカー確認 → トレーニング日タップ → 日次サマリー表示 → 詳細画面遷移が動作する

- [ ] T054 [P] [US3] `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` を実装する（react-native-calendars・トレーニング日ドットマーカー・前後月ナビゲーション・未来日タップ無効）
- [ ] T055 [US3] `apps/mobile/src/features/calendar/components/DaySummary.tsx` を実装する（所要時間・総ボリューム・種目数・セット数・種目別セット詳細・ワークアウトなし日メッセージ）
- [ ] T056 [US3] `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx` を実装する（MonthCalendar + DaySummary パネル・サマリータップで WorkoutDetailScreen に遷移）

**Checkpoint**: カレンダーからワークアウト詳細まで2タップ以内で到達できること（SC-004）

### US4 — 種目別の履歴・統計確認

**Goal**: 種目ごとのパフォーマンス推移・PR・全履歴を確認できる

**Independent Test**: 記録画面の種目名タップ → 履歴画面表示 → 統計サマリー・チャート・PR・全履歴が確認できる

- [ ] T057 [P] [US4] `apps/mobile/src/features/exercise/hooks/useExerciseHistory.ts` を実装する（統計集計・週平均算出・PR履歴・全履歴取得）
- [ ] T058 [P] [US4] `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` に統計サマリーセクション（最大重量・最大ボリューム・平均重量・総トレ回数・総ボリューム・最終PR日）を実装する
- [ ] T059 [P] [US4] `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` に過去3ヶ月の重量推移チャート（react-native-gifted-charts 棒グラフ・週平均）を実装する
- [ ] T060 [US4] `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` に PR 履歴リスト（max_weight/max_volume/max_reps）と全履歴リスト（日付降順・各エントリにセット詳細）を実装する
- [ ] T072 [P] `apps/mobile/src/features/home/`・`calendar/`・`exercise/hooks/useExerciseHistory.ts` のユニットテストを実装する（ストリーク計算・カレンダードットマーカー・統計集計ロジックの正確性を検証）

**Checkpoint**: 全7ユーザーストーリーが独立して動作すること

---

## Phase 6: 仕上げ & 横断的関心事

**Purpose**: エッジケース対応・品質保証・パフォーマンス最適化

- [ ] T061 [P] spec.md Edge Cases の全ケースをコード上で対応確認し、未対応のものを実装する（下書き未保存条件・recording 復帰・nullセット除外・ピッカー空セクション・未来日タップ無効等）
- [ ] T062 [P] 全画面の空状態コンポーネント（EmptyState）を整備する（初回起動ホーム・種目検索0件・カレンダーワークアウトなし日）
- [ ] T063 [P] `apps/mobile/src/shared/hooks/useToast.ts` を実装し、保存/削除失敗時のエラートースト（burnt）を全画面に設置する
- [ ] T064 FlatList の `keyExtractor`・`getItemLayout`・`initialNumToRender`・`windowSize` を最適化し、長リスト（種目一覧・全履歴）で 60fps を維持する
- [ ] T065 `pnpm --filter mobile test --coverage` を実行し、カバレッジ 90% を確認する。不足箇所にテストを追加する（usePreviousRecord・useTimer・calculate1RM・Repository 各メソッドを優先）
- [ ] T066 quickstart.md に記載の手動検証シナリオ（「+」→完了→ホーム反映・詳細→編集→保存/破棄・カレンダー→詳細・バックグラウンド復帰）を実施し、全て合格することを確認する
- [ ] T067 Expo Go（ローカル開発サーバー）での全画面挙動確認と手順書整備（`specs/001-workout-core-screens/quickstart.md` に検証手順を追記する）
- [ ] T068 実機 iPhone での全画面挙動確認と手順書整備（Expo Go アプリ経由、QRコードスキャンから全シナリオ検証、quickstart.md に実機確認手順を追記する）

**Checkpoint**: `pnpm --filter mobile lint` エラーゼロ・カバレッジ 90%+・手動検証全合格（ローカル + 実機 iPhone）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 依存なし — 即座に開始可能
- **Phase 2 (Foundational)**: Phase 1 完了後 — 全 US フェーズをブロック
- **Phase 3 (US1)**: Phase 2 完了後 — MVP コアフロー
- **Phase 4 (US2/US5/US6)**: Phase 2 完了後（Phase 3 と並行可能）
- **Phase 5 (US3/US4/US7)**: Phase 2 完了後（Phase 3/4 と並行可能）
- **Phase 6 (Polish)**: Phase 3〜5 完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後 — 他 US に依存なし
- **US5 (P2)**: Phase 2 完了後、US1 の ExercisePickerScreen 実装後
- **US6 (P2)**: Phase 2 完了後、US1 の RecordScreen・useWorkoutSession 実装後
- **US2 (P2)**: Phase 2 完了後、US1 の完了（WorkoutSummary 経由でデータ生成が必要）
- **US7 (P3)**: Phase 2 完了後 — 完了済みワークアウトデータが必要（US1 後が望ましい）
- **US3 (P3)**: US7 と同様
- **US4 (P3)**: Phase 2 完了後、US1 で種目記録データが生成された後

### Within Each User Story

- Store / Hook → Component → Screen の順に実装
- 計算ユーティリティ（calculate1RM 等）は最初に実装
- 各 Screen は依存する Hook・Component の実装後に着手

---

## Parallel Example: US1（記録フロー）

```
# 並列実行可能（T026-T029）:
Task A: useTimer.ts（バックグラウンド復帰含む）
Task B: useWorkoutSession.ts（セッション管理）
Task C: usePreviousRecord.ts（前回記録取得）
Task D: calculate1RM.ts（Epley 式）

# 上記完了後、並列実行可能:
Task E: TimerBar.tsx
Task F: SetRow.tsx（前回記録インライン表示含む）

# 上記完了後:
Task G: ExerciseBlock.tsx（SetRow を内包）
Task H: ExercisePickerScreen.tsx（useExerciseSearch を内包）

# 全完了後:
Task I: RecordScreen.tsx + WorkoutSummaryScreen.tsx
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（CRITICAL）
3. Phase 3: US1 完了
4. **STOP & VALIDATE**: 「+」→完了→サマリー→ホーム の一連フローを手動検証
5. US1 単独でデモ可能な状態

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 → MVP（記録・完了・サマリー）
3. US5 + US6 → 記録 UX 強化（種目管理・操作性）
4. US2 → 閲覧・編集
5. US7 + US3 + US4 → ダッシュボード・履歴
6. Polish → 品質仕上げ

### Parallel Team Strategy（5エージェント想定）

Phase 2 完了後:
- **Agent A**: US1（記録コアフロー）
- **Agent B**: US5 + US6（種目管理・記録操作）
- **Agent C**: US2（閲覧・編集）
- **Agent D**: US7 + US3（ホーム・カレンダー）
- **Agent E**: US4（種目履歴・チャート）

---

## Summary

| Phase | 対象 | タスク数 |
|-------|------|---------|
| 1 Setup | プロジェクト初期化 | T001-T008, T069（9） |
| 2 Foundational | DB・Store・Nav・UI基盤 | T009-T025（17） |
| 3 US1 | ワークアウト記録（P1） | T026-T036, T070（12） |
| 4 US5/US6/US2 | 種目管理・操作・閲覧編集（P2） | T037-T049, T071（14） |
| 5 US7/US3/US4 | ホーム・カレンダー・種目履歴（P3） | T050-T060, T072（12） |
| 6 Polish | 仕上げ・品質保証・動作確認 | T061-T068（8） |
| **合計** | | **72 タスク** |

---

## Notes

- [P] タスク = 異なるファイル・依存なし → 並列実行可
- [USn] ラベル = 対応するユーザーストーリーへのトレーサビリティ
- 各ユーザーストーリーは独立して完了・テスト可能
- Phase 2 完了の Checkpoint を必ず確認してから US フェーズへ
- 各 Checkpoint で手動検証を行い、合格後に次フェーズへ進む
