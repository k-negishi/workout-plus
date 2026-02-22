# Tasks: ワイヤーフレーム準拠 UI 実装

**Input**: `specs/002-wireframe-ui/` の設計ドキュメント
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

---

## 共通規約（全タスク必読）

### ワイヤーフレーム参照
各タスクの参照先: `requirements/adopted/workout_plus_wireframes_v5_md3.html`
（各タスクに `WF L####〜####` 形式で行番号を明記）

| 画面 | 行範囲 |
|------|--------|
| CSS（全画面共通） | L1〜L2901 |
| screen-home | L2903〜L3127 |
| screen-record | L3128〜L3361 |
| screen-picker | L3362〜L3653 |
| screen-history-full | L3654〜L3816 |
| screen-calendar | L3817〜L3923 |
| screen-stats | L3924〜L4028 |
| screen-summary | L4029〜L4117 |
| screen-workout-detail | L4118〜L4159 |

### カラー規約（必須）
- 実装コードでの色指定は **必ず `colors.X`** を使用すること
- `apps/mobile/src/shared/constants/colors.ts` を参照
- `'#4D94FF'` 等のハードコードは一切禁止
- 新規追加定数は T001 で定義後に使用すること

### TDD 規約（必須）
- CLAUDE.md に基づき、**テストを先に書き FAIL を確認してから実装**すること
- テストタスクは対応する実装タスクの直前に配置してある

---

## Phase 1: Setup — カラー定数の整備

**目的**: 本フィーチャーで使用する全カラーを `colors.ts` に追加し、ハードコード禁止の基盤を整える

- [ ] T001 `apps/mobile/src/shared/constants/colors.ts` に以下を追加する（WF L397〜L478 の StreakCard CSS を参照）
  - `primaryBgSubtle: 'rgba(77, 148, 255, 0.08)'` — StreakCard 背景色（`.streak-card { background: rgba(...) }`）
  - `primaryBorderSubtle: 'rgba(77, 148, 255, 0.15)'` — StreakCard ボーダー色（`.streak-card { border: ... }`）
  - JSDoc コメントを日本語で追加すること

---

## Phase 2: Foundation — ナビゲーション型の更新

**目的**: AI タブと ExerciseHistory エントリーポイントをナビゲーション型に追加する。US1・US7・US8 がこの Phase 完了後に開始可能。

⚠️ **CRITICAL**: Phase 3〜10 の一部タスクはこの Phase 完了後に開始すること

- [ ] T002 `apps/mobile/src/types/navigation.ts` を更新する
  - `MainTabParamList` に `AITab: undefined` を追加
  - `HomeStackParamList` に `ExerciseHistory: { exerciseId: string; exerciseName: string }` を追加
  - `CalendarStackParamList` に `ExerciseHistory: { exerciseId: string; exerciseName: string }` を追加
  - （`RecordStackParamList.ExerciseHistory` は既存のため変更不要）

- [ ] T003 `apps/mobile/src/app/HomeStack.tsx` に `ExerciseHistory` ルートを追加する
  - `ExerciseHistoryFullScreen` へのスクリーン定義を追加（T002 完了後）

- [ ] T004 `apps/mobile/src/app/CalendarStack.tsx` に `ExerciseHistory` ルートを追加する
  - `ExerciseHistoryFullScreen` へのスクリーン定義を追加（T002 完了後）

**Checkpoint**: ナビゲーション型のコンパイルエラーがゼロになること

---

## Phase 3: US1 — タブバーが正しく表示される（Priority: P1）🎯

**Goal**: 5 タブ構成を確立し、AI タブ（プレースホルダー）を追加する

**Independent Test**: アプリを起動 → タブバーに「ホーム」「カレンダー」「+」「統計」「AI」の 5 タブが表示される

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L280〜L389（タブバー CSS）、WF L4460〜L4470（AI タブ HTML）

### Tests for US1 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T005 [P] [US1] `apps/mobile/src/app/__tests__/MainTabs.test.tsx` を新規作成する
  - タブ数が 5 であることを検証
  - 各タブのラベル（「ホーム」「カレンダー」「統計」「AI」）が存在することを検証
  - 中央ボタンの `testID` が存在することを検証

- [ ] T006 [P] [US1] `apps/mobile/src/app/screens/__tests__/AIScreen.test.tsx` を新規作成する
  - 「準備中」テキストが存在することを検証

### Implementation for US1

- [ ] T007 [US1] `apps/mobile/src/app/screens/AIScreen.tsx` を新規作成する（WF L4460〜L4470）
  - 「準備中」テキストを中央表示するプレースホルダー画面
  - スタイルは StatsScreen と同じパターンで実装
  - テキスト色は `colors.textSecondary` を使用

- [ ] T008 [US1] `apps/mobile/src/app/MainTabs.tsx` に AI タブを追加する（WF L280〜L389 タブバー CSS 参照）（T002・T007 完了後）
  - 5 番目に `Tab.Screen name="AITab"` を追加
  - `tabBarLabel: 'AI'`、`tabBarIcon: 'chatbubble-outline'`（Ionicons）
  - アクティブ色: `colors.primary`、非アクティブ色: `colors.textSecondary`

**Checkpoint**: US1 の受け入れシナリオ 1〜4 がすべて目視確認できること

---

## Phase 4: US2 — 各画面がノッチ・ホームバーと重ならない（Priority: P1）

**Goal**: `pt-10` 固定値を `useSafeAreaInsets` に置き換え、全デバイスで安全領域を正しく取得する

**Independent Test**: iPhone（ノッチあり）と Android それぞれで各画面を開き、コンテンツがステータスバーとホームインジケーターと重ならないことを目視確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L1〜L2901（CSS 全体の padding 定義）

### Tests for US2 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T009 [P] [US2] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` を新規作成または更新する
  - `useSafeAreaInsets` が呼ばれることを検証（`jest.mock('react-native-safe-area-context', ...)` を使用）

- [ ] T010 [P] [US2] `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` を新規作成または更新する
  - `useSafeAreaInsets` が呼ばれることを検証

- [ ] T011 [P] [US2] `apps/mobile/src/features/workout/screens/__tests__/RecordScreen.test.tsx` を新規作成または更新する
  - `useSafeAreaInsets` が呼ばれることを検証

### Implementation for US2（各ファイル独立して並列実装可）

- [ ] T012 [P] [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` の SafeArea を修正する（T009 FAIL 確認後）
  - `useSafeAreaInsets()` を import して呼び出す
  - ヘッダーの上部パディングを `paddingTop: insets.top + 16` に変更
  - `pt-10` 等の固定値 Tailwind クラスを削除

- [ ] T013 [P] [US2] `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx` の SafeArea を修正する（T010 FAIL 確認後）
  - `useSafeAreaInsets()` を使用してヘッダー上部パディングを動的取得

- [ ] T014 [P] [US2] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` の SafeArea を修正する（T011 FAIL 確認後）
  - `useSafeAreaInsets()` を使用してヘッダー上部パディングを動的取得
  - タイマーバーとステータスバーが重ならないよう `insets.top` を適用

- [ ] T015 [P] [US2] `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` の SafeArea を修正する
  - `useSafeAreaInsets()` を使用してヘッダー上部パディングを動的取得

- [ ] T016 [P] [US2] `apps/mobile/src/features/workout/screens/WorkoutSummaryScreen.tsx` の SafeArea を修正する
  - `useSafeAreaInsets()` を使用してヘッダー上部パディングを動的取得

- [ ] T017 [P] [US2] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` の SafeArea を修正する
  - フルスクリーンモーダルのヘッダー上部に `insets.top` を適用

- [ ] T018 [P] [US2] `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` の SafeArea を確認・修正する
  - フルスクリーン画面のヘッダー上部に `insets.top` を適用

- [ ] T019 [P] [US2] `apps/mobile/src/features/workout/components/TimerBar.tsx` の SafeArea を確認する
  - ステータスバーとの重なりが発生している場合のみ `insets.top` を適用
  - 既に SafeArea 対応済みであれば変更不要（コメントを残すこと）

**Checkpoint**: US2 の受け入れシナリオ 1〜4 がすべて目視確認できること

---

## Phase 5: US3 — ホーム画面がワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: StreakCard の 7 日インジケーターを塗りつぶし小円形式に修正し、ホーム画面全体のレイアウトをワイヤーフレームに準拠させる

**Independent Test**: ホームタブを開き、StreakCard に 7 個の小円（完了: `colors.primary`・休息: `colors.border`）が曜日ラベルなしで表示されることを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L2903〜L3127（screen-home）、WF L397〜L478（StreakCard CSS）

### Tests for US3 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T020 [P] [US3] `apps/mobile/src/features/home/components/__tests__/StreakCard.test.ts` を更新する（既存ファイル）
  - `done` 日に `backgroundColor: colors.primary`（`#4D94FF`）の View が 7 個レンダリングされることを検証
  - `rest` 日に `backgroundColor: colors.border`（`#e2e8f0`）の View が表示されることを検証
  - 曜日ラベル（「月」「火」等）が存在しないことを検証
  - チェックマーク SVG が存在しないことを検証

### Implementation for US3

- [ ] T021 [US3] `apps/mobile/src/features/home/components/StreakCard.tsx` の 7 日インジケーターを修正する（T020 FAIL 確認後）（WF L457〜L478 `.streak-day-circle` CSS 参照）
  - 各日を `View`（`width: 28, height: 28, borderRadius: 14`）で表示
  - 完了日: `backgroundColor: colors.primary`
  - 休息日: `backgroundColor: colors.border`
  - 曜日ラベルを削除（`<Text>月</Text>` 等を削除）
  - チェックマーク SVG を削除
  - StreakCard カード自体の背景色を `colors.primaryBgSubtle`、ボーダー色を `colors.primaryBorderSubtle` に変更（T001 の定数を使用）

- [ ] T022 [US3] `apps/mobile/src/features/home/screens/HomeScreen.tsx` をワイヤーフレームと照合して UI 調整する（WF L2903〜L3127 screen-home 参照）
  - ヘッダー: グリーティングテキスト左 + ユーザーアバター（イニシャル円形）右のレイアウトを確認
  - 最近のトレーニングカード: 「種目数・セット数・総ボリューム・時間」タグの表示を確認（`colors.primary`、`colors.textSecondary` 等を使用）
  - ダッシュボードウィジェット: 2×2 グリッドの表示を確認
  - 差異があればワイヤーフレームに合わせて修正すること

**Checkpoint**: US3 の受け入れシナリオ 1〜4 がすべて目視確認できること

---

## Phase 6: US4 — 記録画面がワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: 記録画面に種目未追加時の EmptyState を追加し、ワイヤーフレームのセット入力レイアウトと一致させる

**Independent Test**: + ボタンで記録画面を開き、種目未追加時に「+ 種目を追加」誘導テキストが表示されることを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L3128〜L3361（screen-record）

### Tests for US4 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T023 [US4] `apps/mobile/src/features/workout/screens/__tests__/RecordScreen.test.tsx` を新規作成または更新する（T011 と同ファイル）
  - `exercises` が空配列のとき `EmptyState` コンポーネントが表示されることを検証
  - `EmptyState` に「種目を追加」に関するテキストが含まれることを検証

### Implementation for US4

- [ ] T024 [US4] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` に EmptyState を追加する（T023 FAIL 確認後）（WF L3128〜L3361 screen-record 参照）
  - 種目リストが空のとき `shared/components/EmptyState` を中央に表示
  - EmptyState テキスト: 「種目を追加してワークアウトを開始しましょう」
  - EmptyState ボタン: 「+ 種目を追加」（`colors.primary` 背景）
  - タップ時に ExercisePicker モーダルを開く既存のロジックと接続

- [ ] T025 [US4] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` のセット入力 UI をワイヤーフレームと照合して確認する（WF L3128〜L3361 screen-record 参照）
  - 前回記録インライン表示（グレーテキスト）の位置・スタイルを確認
  - 1RM 自動計算値の表示位置を確認
  - 差異があればワイヤーフレームに合わせて修正すること（`colors.textSecondary` を使用）

**Checkpoint**: US4 の受け入れシナリオ 1〜3 がすべて目視確認できること

---

## Phase 7: US5 — カレンダー・詳細画面がワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: カレンダー画面のトレーニング日ドット表示と、ワークアウト詳細画面のセットリスト表示をワイヤーフレームに準拠させる

**Independent Test**: カレンダーでトレーニングのある日付を確認し、青い点インジケーターが表示されることを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L3817〜L3923（screen-calendar）、WF L4118〜L4159（screen-workout-detail）

### Tests for US5 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T026 [P] [US5] `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` を新規作成または更新する（T010 と同ファイル）
  - トレーニングのある日付に `calendarDot`（`testID` 等）が表示されることを検証

- [ ] T027 [P] [US5] `apps/mobile/src/features/workout/screens/__tests__/WorkoutDetailScreen.test.tsx` を新規作成または更新する
  - 種目名がタップ可能（`Pressable` または `TouchableOpacity`）であることを検証

### Implementation for US5

- [ ] T028 [P] [US5] `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx` をワイヤーフレームと照合して確認・修正する（T026 FAIL 確認後）（WF L3817〜L3923 screen-calendar 参照）
  - トレーニングのある日付セルへの青い点インジケーター（`colors.primary`）の表示を確認
  - 日付選択時の詳細エリア（所要時間・総ボリューム・種目数・セット数）の表示を確認
  - 差異があればワイヤーフレームに合わせて修正すること

- [ ] T029 [US5] `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` をワイヤーフレームと照合して確認・修正する（T027 FAIL 確認後）（WF L4118〜L4159 screen-workout-detail 参照）
  - セット行のチェックマーク（`colors.success`）・セット番号・「重量 × 回数」・1RM 表示を確認
  - 差異があればワイヤーフレームに合わせて修正すること

**Checkpoint**: US5 の受け入れシナリオ 1〜3 がすべて目視確認できること

---

## Phase 8: US6 — ワークアウト完了サマリーがワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: 完了サマリー画面に PR 0 件時の非表示ロジックを追加し、ワイヤーフレームに準拠させる

**Independent Test**: ワークアウト完了後、PR ありの場合は「新記録達成」セクションが表示され、PR なしの場合は非表示になることを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L4029〜L4117（screen-summary）

### Tests for US6 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T030 [P] [US6] `apps/mobile/src/features/workout/screens/__tests__/WorkoutSummaryScreen.test.tsx` を新規作成または更新する
  - `personalRecords` が空配列のとき「新記録達成」セクションが非表示になることを検証
  - `personalRecords` にデータがあるとき「新記録達成」セクションが表示されることを検証
  - 「NEW」バッジが PR 種目ごとに表示されることを検証

### Implementation for US6

- [ ] T031 [US6] `apps/mobile/src/features/workout/screens/WorkoutSummaryScreen.tsx` を修正する（T030 FAIL 確認後）（WF L4029〜L4117 screen-summary 参照）
  - `personalRecords.length > 0` のときのみ「新記録達成」セクションをレンダリング
  - ストリークカードの背景色を `colors.primary`（背景）・`colors.white`（テキスト）で表示
  - 「NEW」バッジのスタイルを `colors.primary` 背景・`colors.white` テキストで実装

**Checkpoint**: US6 の受け入れシナリオ 1〜3 がすべて目視確認できること

---

## Phase 9: US7 — 種目選択画面がワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: ExercisePicker の検索 0 件時の空状態を実装し、ワイヤーフレームに準拠させる

**Independent Test**: ExercisePicker でヒットしない文字列を検索し、「該当する種目が見つかりません」が表示されることを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L3362〜L3653（screen-picker）

### Tests for US7 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T032 [P] [US7] `apps/mobile/src/features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx` を新規作成または更新する
  - 検索結果が空配列のとき「該当する種目が見つかりません」テキストが表示されることを検証
  - 検索バーが存在することを検証

### Implementation for US7

- [ ] T033 [US7] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` に検索 0 件の空状態を追加する（T032 FAIL 確認後）（WF L3362〜L3653 screen-picker 参照）
  - `filteredExercises.length === 0 && searchQuery.length > 0` のとき `EmptyState` を表示
  - EmptyState テキスト: 「該当する種目が見つかりません」
  - テキスト色: `colors.textSecondary`
  - ワイヤーフレームと照合して検索バー・種目リスト・モーダルヘッダーのスタイルを確認・修正

**Checkpoint**: US7 の受け入れシナリオ 1〜3 がすべて目視確認できること

---

## Phase 10: US8 — 種目履歴画面がワイヤーフレームのレイアウトで表示される（Priority: P2）

**Goal**: 記録画面とワークアウト詳細画面の種目名タップから ExerciseHistory に遷移できるようにする

**Independent Test**: 記録中の種目名タップで ExerciseHistoryFullScreen がフルスクリーンで開くことを確認

**WF参照**: `requirements/adopted/workout_plus_wireframes_v5_md3.html` WF L3654〜L3816（screen-history-full）

### Tests for US8 ⚠️ テストを先に書き FAIL を確認してから実装すること

- [ ] T034 [P] [US8] `apps/mobile/src/features/workout/screens/__tests__/RecordScreen.test.tsx` を更新する（T011・T023 と同ファイル）
  - 種目名タップで `navigation.push('ExerciseHistory', { exerciseId, exerciseName })` が呼ばれることを検証

- [ ] T035 [P] [US8] `apps/mobile/src/features/workout/screens/__tests__/WorkoutDetailScreen.test.tsx` を更新する（T027 と同ファイル）
  - 種目名タップで `navigation.push('ExerciseHistory', { exerciseId, exerciseName })` が呼ばれることを検証

### Implementation for US8（T002・T003・T004 完了後）

- [ ] T036 [P] [US8] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` に種目名タップハンドラーを追加する（T034 FAIL 確認後）
  - 種目名（ExerciseBlock 内）を `Pressable` でラップ
  - `onPress: () => navigation.push('ExerciseHistory', { exerciseId, exerciseName })`
  - タップ可能を示すスタイル（`colors.primary` テキスト色、または underline）を追加

- [ ] T037 [P] [US8] `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` に種目名タップハンドラーを追加する（T035 FAIL 確認後）
  - 種目名を `Pressable` でラップ
  - `onPress: () => navigation.push('ExerciseHistory', { exerciseId, exerciseName })`

- [ ] T038 [US8] `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx` をワイヤーフレームと照合して UI を確認・修正する（WF L3654〜L3816 screen-history-full 参照）
  - 統計サマリーグリッド（6 項目）の表示を確認
  - 過去履歴リスト（日付・セット一覧）の表示を確認
  - カラーが `colors.X` 定数を使用していることを確認。直書き箇所があれば修正
  - 戻るボタンのスタイルを確認

- [ ] T039 [US8] `apps/mobile/src/app/screens/StatsScreen.tsx`（既存）または新規作成でプレースホルダーを確認する（WF L3924〜L4028 screen-stats 参照）
  - 「準備中」表示がない場合のみ追加（AIScreen と同パターン）
  - テキスト色は `colors.textSecondary`

**Checkpoint**: US8 の受け入れシナリオが目視確認できること

---

## Phase 11: Polish & Cross-Cutting

**目的**: 全ユーザーストーリー実装後の品質確認

- [ ] T040 [P] 全変更ファイルで `colors.X` 定数が使われており直書き hex がないことを確認する
  - `pnpm --filter mobile tsc --noEmit` でコンパイルエラーがゼロであることを確認

- [ ] T041 [P] `pnpm lint` を実行してエラーがゼロであることを確認する
  - lint エラーがある場合は修正すること

- [ ] T042 `pnpm --filter mobile test --coverage` を実行してカバレッジ 90%+ を確認する
  - カバレッジが不足している場合はテストを追加すること

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1（Setup: colors）← 最優先。すぐ開始可
Phase 2（Foundation: navigation types）← Phase 1 完了後
    ├── Phase 3（US1: タブバー）← Phase 2 完了後
    ├── Phase 10（US8: ExerciseHistory）← Phase 2 完了後
Phase 4（US2: SafeArea）← Phase 1 完了後、Phase 2 と並列可
Phase 5（US3: ホーム）← Phase 1 完了後、Phase 2 と並列可
Phase 6（US4: 記録）← Phase 1 完了後、Phase 2 と並列可
Phase 7（US5: カレンダー）← Phase 1 完了後、Phase 2 と並列可
Phase 8（US6: サマリー）← Phase 1 完了後、独立
Phase 9（US7: ExercisePicker）← Phase 1 完了後、独立
Phase 11（Polish）← Phase 3〜10 完了後
```

### Parallel Execution（5 エージェント構成）

```
Agent 1: T001 → T002 → T003 → T004 → T007 → T008（Setup〜US1）
Agent 2: T005 → T006（US1 テスト）
Agent 3: T009〜T019（US2: SafeArea 全スクリーン）
Agent 4: T020 → T021 → T022（US3: ホーム）+ T030 → T031（US6: サマリー）
Agent 5: T023 → T024 → T025（US4: 記録）+ T032 → T033（US7: ExercisePicker）
         ※ Phase 2 完了後に T034〜T039（US8: ExerciseHistory）に移行
```

---

## Parallel Examples

### US2 SafeArea（全スクリーン独立、最大並列実行）

```
同時実行可能（T012〜T019 の [P] タスク）:
  Task: HomeScreen.tsx SafeArea 修正
  Task: CalendarScreen.tsx SafeArea 修正
  Task: RecordScreen.tsx SafeArea 修正
  Task: WorkoutDetailScreen.tsx SafeArea 修正
  Task: WorkoutSummaryScreen.tsx SafeArea 修正
  Task: ExercisePickerScreen.tsx SafeArea 修正
  Task: ExerciseHistoryFullScreen.tsx SafeArea 修正
```

---

## Implementation Strategy

### MVP First（P1 のみ）

1. Phase 1: Setup（T001）
2. Phase 2: Foundation（T002〜T004）
3. Phase 3: US1 タブバー（T005〜T008）
4. Phase 4: US2 SafeArea（T009〜T019）
5. **STOP and VALIDATE**: SC-001・SC-002 を Expo Go で目視確認

### Incremental Delivery

1. Setup + Foundation → ナビゲーション基盤完成
2. P1 完了（US1 + US2）→ タブバー + SafeArea 修正
3. P2 順次追加（US3〜US8）→ 各画面のワイヤーフレーム準拠
4. 各フェーズ後に Expo Go で目視確認（SC-003: 95%以上一致）

---

## Notes

- `[P]` タスク = 異なるファイルで依存なし、並列実行可
- カラーは必ず `colors.X`（`apps/mobile/src/shared/constants/colors.ts`）を使用。`#4D94FF` 等の直書き禁止
- テストは実装前に FAIL することを確認してから実装を開始すること
- 各 Checkpoint で Expo Go を起動して目視確認を行うこと
- ワイヤーフレーム参照: `requirements/adopted/workout_plus_wireframes_v5_md3.html`（各タスクに行番号付き）
