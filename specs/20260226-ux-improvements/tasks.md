# タスクリスト: UX バグ修正 & 改善バッチ

## 凡例
- `[USx]` : 対応ユーザーストーリー番号
- `[P]` : 他タスクと並列実行可能
- `[依存: Txx]` : 前提タスクの完了が必要

---

## Phase 1: タイマー修正 (US1)

### T001 [US1][P]
**useTimer.test.ts — タイマー速度テスト（確認）**
- ファイル: `apps/mobile/src/features/workout/hooks/__tests__/useTimer.test.ts`
- 作業: 既存テスト `Issue #149: インターバルが指数的に速く進まないことの確認` が現在 FAIL していることを確認する（`pnpm --filter mobile test useTimer` を実行）
- 完了条件: FAIL していることが確認できた（Red フェーズ確認済み）

### T002 [US1][P] [依存: T001]
**useTimer.ts — interval deps 修正（#149 Green）**
- ファイル: `apps/mobile/src/features/workout/hooks/useTimer.ts`
- 作業:
  1. `useEffect`（running 時インターバル管理）の依存配列から `elapsedSeconds` を除外する
  2. インターバルコールバック内では `timerStartedAt` をクロージャにキャプチャし、
     `Date.now() - capturedStartedAt` の差分のみを `useWorkoutSessionStore.getState().elapsedSeconds` に加算する
  3. `// eslint-disable-next-line react-hooks/exhaustive-deps` コメントと理由を追記する
  4. `displayElapsed` の計算式（現在は常に `elapsedSeconds` を返しているだけ）を削除またはシンプル化する
- 完了条件: `pnpm --filter mobile test useTimer` が全 PASS

### T003 [US1][P] [依存: T002]
**useTimer.test.ts — discarded 後の再開不可テスト追加（#150 Red）**
- ファイル: `apps/mobile/src/features/workout/hooks/__tests__/useTimer.test.ts`
- 作業:
  - `describe('discarded 後の再開防止 (#150)')` を追加し以下テストを記述:
    1. `stopTimer() 後に resumeTimer() を呼んでもタイマーは running にならない`
    2. `stopTimer() 後の timerStatus は discarded のまま`
- 完了条件: 追加テストが FAIL（Red）

### T004 [US1][P] [依存: T003]
**useTimer.ts — discarded 後の再開防止（#150 Green）**
- ファイル: `apps/mobile/src/features/workout/hooks/useTimer.ts`
- 作業:
  - `resumeTimer` コールバック先頭に guard を追加:
    ```typescript
    if (timerStatus === 'discarded') return;
    ```
- 完了条件: T003 の追加テストが全 PASS

---

## Phase 2: 登録画面 UI 修正 (US2)

### T005 [US2][P]
**SetRow.test.tsx — プレースホルダーなしテスト追加（#146 Red）**
- ファイル: `apps/mobile/src/features/workout/components/__tests__/SetRow.test.tsx`
- 作業:
  - `describe('プレースホルダー (#146)')` を追加:
    1. `kg 入力欄にプレースホルダーが存在しない`（`queryByPlaceholderText` が null を返す）
    2. `rep 入力欄にプレースホルダーが存在しない`
- 完了条件: 追加テストが FAIL（rep の方が `placeholder="0"` により FAIL する）

### T006 [US2][P] [依存: T005]
**SetRow.tsx — rep プレースホルダー削除（#146 Green）**
- ファイル: `apps/mobile/src/features/workout/components/SetRow.tsx`
- 作業:
  - rep 入力の `TextInput` から `placeholder="0"` と `placeholderTextColor` を削除する
- 完了条件: T005 の追加テストが全 PASS

### T007 [US2][P]
**ExerciseBlock.test.tsx — テスト実行確認（#147/#148/#151 Red 確認）**
- ファイル: `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx`
- 作業:
  - `pnpm --filter mobile test ExerciseBlock` を実行し、以下が FAIL していることを確認:
    - `メモ入力リセット防止 (#147)` > `メモに文字を入力すると入力値が表示され続ける`
    - `種目削除確認モーダル (#148)` の一連のテスト
    - `種目名カラー (#151)` > `種目名テキストが #4D94FF カラーで表示される`
- 完了条件: 各テストの FAIL が確認できた（Red フェーズ確認済み）

### T008 [US2][P] [依存: T007]
**ExerciseBlock.tsx — メモ local state 化（#147 Green）**
- ファイル: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`
- 作業:
  1. `useState` を import に追加
  2. コンポーネント内でローカル state `const [localMemo, setLocalMemo] = useState(memo ?? '')` を定義
  3. `useEffect` で `memo` prop の外部変更を監視: `useEffect(() => { setLocalMemo(memo ?? ''); }, [memo])`
  4. `TextInput` の `value` を `localMemo` に変更
  5. `onChangeText` を `(text) => { setLocalMemo(text); onMemoChange?.(text); }` に変更
- 完了条件: T007 の `#147` テストが PASS

### T009 [US2][P] [依存: T007]
**ExerciseBlock.tsx — 削除確認 Alert 追加（#148 Green）**
- ファイル: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`
- 作業:
  1. `Alert` を `react-native` の import に追加
  2. 削除ボタンの `onPress` を以下に変更:
     ```typescript
     onPress={() => {
       Alert.alert(
         'この種目を削除しますか？',
         '入力済みのセットもすべて削除されます',
         [
           { text: 'キャンセル', style: 'cancel' },
           { text: '削除する', style: 'destructive', onPress: onDeleteExercise },
         ],
       );
     }}
     ```
- 完了条件: T007 の `#148` テストが PASS

### T010 [US2][P] [依存: T007]
**ExerciseBlock.tsx — 種目名カラー変更（#151 Green）**
- ファイル: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`
- 作業:
  - 種目名 `Text` の `color` を `'#334155'` → `'#4D94FF'` に変更
- 完了条件: T007 の `#151` テストが PASS

---

## Phase 3: カレンダー修正 (US3)

### T011 [US3][P]
**CalendarScreen.test.tsx — ローディング中ボタン非表示テスト追加（#152 Red）**
- ファイル: `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx`
- 作業:
  - `describe('ちらつき解消 (#152)')` を追加:
    1. `日付変更直後（DaySummary ローディング中）は削除ボタンが非表示`
       - `handleDayPress` を呼び出した直後、`delete-workout-button` が queryByTestId で null を返すこと
    2. `DaySummary が workoutId を通知した後に削除ボタンが表示される`
       - `mockDaySummaryOnWorkoutFound` で workoutId を渡した後に `delete-workout-button` が表示されること
- 完了条件: 追加テストが FAIL（Red）

### T012 [US3][P] [依存: T011]
**CalendarScreen.tsx — ローディング中削除ボタン非表示（#152 Green）**
- ファイル: `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx`
- 作業:
  1. `DaySummary` に `onLoadingChange?: (loading: boolean) => void` props を追加することは避け、
     `handleDayPress` で `setCurrentWorkoutId(null)` に加えて新しいローディング state `const [daySummaryLoading, setDaySummaryLoading] = useState(false)` を追加する
  2. `handleDayPress` 内で `setDaySummaryLoading(true)` を呼ぶ
  3. `DaySummary` の `onWorkoutFound` コールバックを以下に変更:
     ```typescript
     onWorkoutFound={(id) => {
       setCurrentWorkoutId(id);
       setDaySummaryLoading(false);
     }}
     ```
  4. 削除ボタンの表示条件を `currentWorkoutId && !daySummaryLoading` に変更
- 完了条件: T011 の追加テストが全 PASS

### T013 [US3][P]
**CalendarScreen.test.tsx — 削除機能テスト追加（#153 確認・補強）**
- ファイル: `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx`
- 作業:
  - `describe('ワークアウト削除 (#153)')` を追加:
    1. `削除ボタンタップで ConfirmDialog が表示される`
    2. `ConfirmDialog の確認ボタンタップで WorkoutRepository.delete が呼ばれる`
    3. `削除後に refreshKey が変化し DaySummary が再取得される`
    4. `削除後にカレンダーのトレーニング日データが再取得される（fetchTrainingDates 再呼び出し）`
- 完了条件: テスト PASS（実装は既に完了しているため Green になるはず。FAIL なら実装も修正）

### T014 [US3][P]
**DaySummary.test.tsx — 推定1RMベスト表示テスト確認（#154 Red 確認）**
- ファイル: `apps/mobile/src/features/calendar/components/__tests__/DaySummary.test.tsx`
- 作業:
  - `pnpm --filter mobile test DaySummary` を実行し、
    `estimated_1rm が設定されたセットがある場合に「推定 1RM ベスト: 133kg」が表示される` が FAIL していることを確認する
- 完了条件: FAIL が確認できた（Red フェーズ確認済み）

### T015 [US3][P] [依存: T014]
**DaySummary.tsx — 推定1RMベスト表示追加（#154 Green）**
- ファイル: `apps/mobile/src/features/calendar/components/DaySummary.tsx`
- 作業:
  1. `ExerciseSetData` 型に `best1RM: number | null` フィールドを追加
  2. `fetchDayData` 内でセット取得後に `best1RM = Math.max(...sets.filter(s => s.estimated_1rm != null).map(s => s.estimated_1rm!))` を計算する（空配列の場合は `null`）
  3. `exerciseData.push` に `best1RM` を追加
  4. 種目カードの種目名と種目メモの間に以下を表示:
     ```tsx
     {ex.best1RM != null ? (
       <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
         推定 1RM ベスト: {ex.best1RM}kg
       </Text>
     ) : null}
     ```
- 完了条件: T014 の追加テストが PASS。既存テスト全 PASS

---

## Phase 4: ヘッダー統一 (US4)

### T016 [US4][P]
**全スクリーンのヘッダー実装状況調査（#142）**
- 対象: `HomeStack` / `CalendarStack` 配下の全スクリーン
  - HomeScreen, RecordScreen, ExercisePickerScreen, WorkoutSummaryScreen, ExerciseHistoryFullScreen
  - CalendarScreen（上記と共通）
- 作業: 各画面のヘッダー実装方式（カスタムヘッダー有無・SafeArea 対応方法）をリストアップし、
  統一するヘッダーデザイン（背景色・タイトルスタイル・戻るボタンスタイル）を確定する
- 完了条件: 統一方針メモを作成（本 tasks.md コメントに追記するか spec.md に反映）

### T017 [US4][P] [依存: T016]
**HomeStack.tsx / CalendarStack.tsx — screenOptions ヘッダースタイル統一（#142）**
- ファイル:
  - `apps/mobile/src/app/HomeStack.tsx`
  - `apps/mobile/src/app/CalendarStack.tsx`
- 作業:
  1. T016 で確定したスタイルを `screenOptions` に適用する
  2. RecordScreen など個別上書きが必要な画面は `<Stack.Screen options={{ headerShown: false }} />` で上書き
- 完了条件: 全スクリーンでヘッダースタイルが統一されること（Expo Go 実機確認）

### T018 [US4][P] [依存: T017]
**CalendarStack.test.tsx — ヘッダースタイルテスト追加（#142）**
- ファイル: `apps/mobile/src/app/__tests__/CalendarStack.test.tsx`
- 作業:
  - ヘッダー背景色・タイトルカラーが期待値と一致することをテスト
- 完了条件: テスト PASS

---

## Phase 5: 統合テスト・品質確認

### T019 [P] [依存: T001〜T018]
**全テスト Pass・Lint・型チェック**
- 作業:
  1. `pnpm --filter mobile test --coverage` でカバレッジ確認（目標 90%+）
  2. `pnpm lint` でエラーなし
  3. `pnpm --filter mobile tsc --noEmit` で型エラーなし
  4. `pnpm --filter mobile format:check` で Prettier エラーなし
- 完了条件: 全チェック Pass

---

## タスク依存関係まとめ

```
T001 → T002 → T003 → T004   (タイマー修正)
T005 → T006                  (SetRow)
T007 → T008                  (メモ local state)
T007 → T009                  (削除確認 Alert)
T007 → T010                  (種目名カラー)
T011 → T012                  (CalendarScreen ちらつき)
T013                          (削除テスト独立)
T014 → T015                  (DaySummary 1RM)
T016 → T017 → T018           (ヘッダー統一)
全 → T019                    (品質確認)
```

並列実行可能グループ:
- **Group A**: T001〜T004（タイマー）
- **Group B**: T005〜T010（登録画面 UI）
- **Group C**: T011〜T015（カレンダー）
- **Group D**: T016〜T018（ヘッダー）
- **Group E**: T019（全完了後）
