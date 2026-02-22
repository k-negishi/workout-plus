# タスク一覧: RecordScreen 再設計

## Phase 1: UIコンポーネント刷新（並列実行可）

### T01: ExerciseBlock カードデザイン適用
**依存:** なし
**並列:** T02 と並列可

#### テスト（Red）
- `ExerciseBlock.test.tsx` を作成/更新
- 外枠が `bg-white border rounded-lg` のカードスタイルであること
- 種目名が `16px #334155` で表示されること
- カラムヘッダー行（Set/kg/回/1RM）が表示されること
- 削除ボタンがテキスト `✕` で表示されること
- 「+ セットを追加」がテキストリンクのみ（背景・ボーダーなし）であること
- `showPreviousRecord={false}` のとき前回記録バッジが表示されないこと

#### 実装（Green）
- `ExerciseBlock.tsx` を更新:
  - 外枠: `className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-3"` に変更
  - 種目名: `text-[16px] font-semibold text-[#334155]`（#4D94FF から変更）
  - 削除ボタン: `Ionicons trash-outline` → テキスト `✕ 16px #64748b p-1`
  - ヘッダー行下マージン: `mb-3`
  - カラムヘッダー行を ExerciseBlock 内（FlatList の上）に追加
  - 「+ セットを追加」: `className="mt-2 py-2"` のテキストリンクに変更（背景・破線ボーダー削除）
  - props に `showPreviousRecord?: boolean`（デフォルト `true`）を追加
- `RecordScreen.tsx` の `ExerciseBlockWithPrevious` で `showPreviousRecord` を渡す

#### 検証
```bash
pnpm --filter mobile test -- ExerciseBlock
```

---

### T02: SetRow NumericInput → TextInput 化
**依存:** なし
**並列:** T01 と並列可

#### テスト（Red）
- `SetRow.test.tsx` を作成/更新
- 枠線なし（行全体の border が存在しないこと）
- セット番号幅が `32px`（w-8）であること
- 重量入力が `keyboardType="decimal-pad"` であること
- レップ入力が `keyboardType="number-pad"` であること
- placeholder が `"-"` であること
- 1RM 未計算時に `"-"` が表示されること
- 削除ボタンがテキスト `✕` であること

#### 実装（Green）
- `SetRow.tsx` を更新:
  - 行全体の `px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg` を `flex-row items-center gap-2` に変更
  - セット番号: `style={{ width: 24 }}` → `className="w-8 text-[14px] text-[#64748b] text-left"`
  - `NumericInput` × 2 → `TextInput` × 2 に置き換え
    - 共通: `flex-1 bg-[#FAFBFC] border border-[#e2e8f0] rounded-lg py-2 text-[15px] font-semibold text-[#334155] text-center`
    - 重量: `keyboardType="decimal-pad"`, placeholder=`"-"`, placeholderTextColor=`#94a3b8`
    - レップ: `keyboardType="number-pad"`, placeholder=`"-"`, placeholderTextColor=`#94a3b8`
  - x 区切り: `×`（U+00D7）→ テキスト `"x"`, `14px #64748b`
  - 1RM: `"1RM {value}"` → `w-12 text-center`、未計算時 `"-"`
  - 削除: `w-5 h-5 items-center justify-center opacity-40`、テキスト `"✕"` 12px
  - セット間 gap: `gap-[2px]` → `gap-2`（ExerciseBlock 側を更新）

#### 検証
```bash
pnpm --filter mobile test -- SetRow
```

---

## Phase 2: ロジック層変更

### T03: useWorkoutSession startSession API 変更
**依存:** T01, T02 完了後（UI が先）
**並列:** T04 と並列可

#### テスト（Red）
- `useWorkoutSession.test.ts` を更新
  - `startSession({ workoutId })` で既存ワークアウトをロードできること
  - `startSession({ targetDate })` で過去日付の新規ワークアウトが作成できること
  - `startSession()` で従来の新規作成が動作すること
- `useWorkoutSession.edit.test.ts` を更新
  - `startSession({ workoutId })` でセット値変更がリアルタイムに DB 保存されること
  - 編集モードで `completeWorkout()` が呼べること

#### 実装（Green）
- `useWorkoutSession.ts` を更新:
  - `startSession(workoutId?: string, targetDate?: string)` → `startSession(options?: { workoutId?: string; targetDate?: string })` に変更
  - 内部で `const { workoutId, targetDate } = options ?? {}` に分解
  - 既存ロジックの本質は変えない（引数の形式変更のみ）

#### 検証
```bash
pnpm --filter mobile test -- useWorkoutSession
```

---

### T04: workoutSessionStore pendingContinuationWorkoutId 削除
**依存:** T03 完了後
**並列:** なし（T03 の完了が前提）

#### テスト（Red）
- `workoutSessionStore` の型から `pendingContinuationWorkoutId` が存在しないこと（型チェック）
- `RecordScreen` が `pendingContinuationWorkoutId` を参照していないこと

#### 実装（Green）
- `workoutSessionStore.ts` を更新:
  - `pendingContinuationWorkoutId: string | null` フィールドを削除
  - `setPendingContinuationWorkoutId` アクションを削除
- 型エラーになる参照箇所を全て修正:
  - `MainTabs.tsx`: `store.setPendingContinuationWorkoutId(...)` → 削除（FloatingRecordButton は T07 で廃止）
  - `WorkoutDetailScreen.tsx`: `continuationStore.setPendingContinuationWorkoutId(...)` → T12 で対応（workoutId を params 直接渡し）
  - `RecordScreen.tsx`: `pendingContinuationWorkoutId` 参照 → T09 で削除

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
```

---

## Phase 3: ナビゲーション再設計

### T05: navigation.ts 型定義更新
**依存:** T04 完了後
**並列:** なし

#### 実装
- `navigation.ts` を更新:
  - `MainTabParamList` から `RecordTab: undefined` を削除
  - `HomeStackParamList` から `WorkoutEdit: { workoutId: string }` を削除
  - `HomeStackParamList` に以下を追加:
    ```typescript
    Record: { workoutId?: string; targetDate?: string } | undefined;
    ExercisePicker: { mode: 'single' | 'multi' };
    WorkoutSummary: { workoutId: string };
    ```
    ※ `ExerciseHistory` は既に存在するので確認のみ
  - `CalendarStackParamList` から `WorkoutEdit` を削除
  - `CalendarStackParamList` に同様の Record / ExercisePicker / WorkoutSummary を追加
  - `RecordStackParamList` を削除
  - Screen Props 型を更新（`HomeRecordScreenProps`, `CalendarRecordScreenProps` 等を追加）

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
```

---

### T06: HomeStack / CalendarStack に Record フローを追加
**依存:** T05 完了後
**並列:** なし（T05 の型定義が必要）

#### 実装
- `HomeStack.tsx` を更新:
  ```
  Home → WorkoutDetail → ExerciseHistory
                       → Record → ExercisePicker → ExerciseHistory
                                → WorkoutSummary
  ```
  - `WorkoutEditScreen` インポートを削除、`WorkoutEdit` Screen を削除
  - `RecordScreen`, `ExercisePickerScreen`, `WorkoutSummaryScreen` をインポート・追加
- `CalendarStack.tsx` を更新: 同様の変更

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
```

---

### T07: MainTabs 4タブ化・FloatingRecordButton 廃止
**依存:** T06 完了後
**並列:** なし

#### テスト（Red）
- `MainTabs.test.tsx` を更新:
  - `testID="record-tab-button"` が存在しないこと
  - タブが 4つ（Home/Calendar/Stats/AI）であること

#### 実装（Green）
- `MainTabs.tsx` を更新:
  - `FloatingRecordButton` コンポーネントを削除
  - `RecordStack` インポートを削除
  - `<Tab.Screen name="RecordTab" ... />` を削除
  - `CustomTabBar` の `BUTTON_RISE`・中央ボタン特別処理を削除
  - `calendarSelectedDate` の store 参照が不要なら削除
  - 4タブのシンプルな `CustomTabBar` に整理

#### 検証
```bash
pnpm --filter mobile test -- MainTabs
pnpm --filter mobile tsc --noEmit
```

---

### T08: RecordStack 廃止
**依存:** T07 完了後

#### 実装
- `apps/mobile/src/app/RecordStack.tsx` を削除
- 参照箇所がないことを確認（T07 で MainTabs から削除済み）

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
```

---

## Phase 4: 画面変更

### T09: RecordScreen スタック画面化・params 拡張
**依存:** T08 完了後
**並列:** T10, T11 と並列可

#### テスト（Red）
- `RecordScreen.test.tsx` を更新:
  - `route.params.workoutId` が渡された場合、既存ワークアウトをロードすること
  - `route.params.targetDate` が渡された場合、過去日付で新規作成すること
  - 編集モード（workoutId あり）では前回記録バッジが表示されないこと
  - `useFocusEffect` が不要になること（useEffect に変更）

#### 実装（Green）
- `RecordScreen.tsx` を更新:
  - `useFocusEffect` + `sessionInitializedRef` パターン → `useEffect` に変更
    - スタック遷移でアンマウントされるため `useFocusEffect` は不要
  - `route.params` の型を拡張: `{ workoutId?: string; targetDate?: string }`
  - `pendingContinuationWorkoutId` 参照を削除
  - `session.startSession(options)` の呼び出しに変更
  - 編集モード判定: `const isEditMode = !!route.params?.workoutId`
  - `ExerciseBlockWithPrevious` に `showPreviousRecord={!isEditMode}` を渡す
  - `completeWorkout` 後の遷移先を `HomeStack` または `CalendarStack` の `WorkoutSummary` に変更

#### 検証
```bash
pnpm --filter mobile test -- RecordScreen
```

---

### T10: HomeScreen 記録ボタン・バナー追加
**依存:** T08 完了後
**並列:** T09, T11 と並列可

#### テスト（Red）
- `HomeScreen.test.tsx` を作成/更新:
  - 「本日のワークアウトを記録」ボタンが表示されること
  - 記録中セッションがある場合「記録中」バナーが表示されること
  - ボタンタップで `RecordScreen` に遷移すること

#### 実装（Green）
- `HomeScreen.tsx` を更新:
  - `WorkoutRepository.findRecording()` で記録中セッションを確認
  - 記録中バナー: 「ワークアウト記録中・再開する →」を表示、タップで `navigation.navigate('Record')`
  - 「本日のワークアウトを記録」ボタンを追加:
    - タップ時: `WorkoutRepository.findTodayCompleted()` で当日完了済みを確認
    - 完了済みあり → `navigate('Record', { workoutId: todayWorkout.id })`
    - なし → `navigate('Record')`（新規）

#### 検証
```bash
pnpm --filter mobile test -- HomeScreen
pnpm --filter mobile tsc --noEmit
```

---

### T11: CalendarScreen 編集ボタン追加
**依存:** T08 完了後
**並列:** T09, T10 と並列可

#### テスト（Red）
- `CalendarScreen.test.tsx` を作成/更新:
  - 日付選択時に編集ボタン（または「記録・編集」ボタン）が表示されること
  - タップで `RecordScreen` に遷移すること
  - 既存ワークアウトありの場合 `workoutId` が渡されること
  - 既存ワークアウトなしの場合 `targetDate` が渡されること

#### 実装（Green）
- `CalendarScreen.tsx` を更新:
  - `calendarSelectedDate` store への write は引き続き行う（MainTabs では使わなくなるが、他の画面が使う可能性）
  - `DaySummary` またはインライン実装で「記録・編集」ボタンを追加
  - タップ時:
    - `WorkoutRepository.findCompletedByDate(selectedDate)` で既存確認
    - 既存あり → `navigation.navigate('Record', { workoutId: existingWorkout.id })`
    - なし → `navigation.navigate('Record', { targetDate: selectedDate })`

#### 検証
```bash
pnpm --filter mobile test -- CalendarScreen
pnpm --filter mobile tsc --noEmit
```

---

### T12: WorkoutDetailScreen 「続きを記録」→「編集」
**依存:** T08 完了後
**並列:** T09, T10, T11 と並列可

#### 実装
- `WorkoutDetailScreen.tsx` を更新:
  - `handleContinueWorkout` を削除（または `handleEditWorkout` にリネーム）
  - `continuationStore.setPendingContinuationWorkoutId(...)` を削除
  - `navigation.navigate('RecordTab' as never)` → `navigation.navigate('Record', { workoutId })` に変更
  - ボタンラベル「続きを記録」→「編集」

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
```

---

### T13: WorkoutEditScreen 廃止
**依存:** T06（HomeStack/CalendarStack から WorkoutEdit を削除済み）
**並列:** なし

#### 実装
- `apps/mobile/src/features/workout/screens/WorkoutEditScreen.tsx` を削除
- 関連テストファイルがあれば削除
- `WorkoutEditScreen` のインポートが残っていないことを確認

#### 検証
```bash
pnpm --filter mobile tsc --noEmit
pnpm lint
```

---

## 最終検証

```bash
pnpm --filter mobile test --coverage
pnpm --filter mobile tsc --noEmit
pnpm lint
```

## チェックリスト

- [ ] T01: ExerciseBlock カードデザイン
- [ ] T02: SetRow TextInput 化
- [ ] T03: useWorkoutSession startSession API 変更
- [ ] T04: workoutSessionStore pendingContinuationWorkoutId 削除
- [ ] T05: navigation.ts 型定義更新
- [ ] T06: HomeStack / CalendarStack 更新
- [ ] T07: MainTabs 4タブ化
- [ ] T08: RecordStack 廃止
- [ ] T09: RecordScreen スタック画面化
- [ ] T10: HomeScreen 記録ボタン追加
- [ ] T11: CalendarScreen 編集ボタン追加
- [ ] T12: WorkoutDetailScreen 「編集」ボタン
- [ ] T13: WorkoutEditScreen 廃止
