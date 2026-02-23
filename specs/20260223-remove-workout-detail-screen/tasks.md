# タスク一覧: ワークアウト詳細画面の廃止とカレンダー画面への統合

**Issue:** #127
**仕様書:** spec.md
**計画:** plan.md

## Phase 1: DB層（基盤）

### T1: workout_date カラム追加マイグレーション
- [ ] **TDD**: マイグレーション V5 で `workouts` テーブルに `workout_date TEXT` カラムを追加
- **ファイル:** `database/migrations.ts`, `database/schema.ts`
- **内容:**
  1. `ALTER TABLE workouts ADD COLUMN workout_date TEXT`
  2. 既存 completed ワークアウトの `completed_at` → `workout_date` 変換（`date(completed_at/1000, 'unixepoch', 'localtime')` 相当を JS で算出）
  3. 同日重複データがある場合は最新のみ残して古い方を削除
  4. `CREATE UNIQUE INDEX idx_workouts_unique_date ON workouts(workout_date) WHERE workout_date IS NOT NULL`
  5. `LATEST_VERSION` を 5 に更新
  6. `schema.ts` に JSDoc 追加
- **テスト:** マイグレーション実行後にカラム存在確認、UNIQUE 制約違反テスト、NULL（recording）は制約対象外の確認
- **依存:** なし
- **並列:** T2 と並列不可（T2 は T1 完了後）

### T2: WorkoutRepository に workout_date 自動セットロジック追加
- [ ] **TDD**: ワークアウト完了時に `workout_date` を自動セットする
- **ファイル:** `database/repositories/workout.ts`, `database/types.ts`
- **内容:**
  1. `WorkoutRow` 型に `workout_date: string | null` を追加
  2. `WorkoutRepository.update()`: status が `'completed'` に変更される際に `workout_date` を `completed_at` から算出してセット
  3. `WorkoutRepository.create()`: `workout_date` は初期値 NULL（recording 状態）
- **テスト:** 完了時に workout_date がセットされること、recording 中は NULL であること
- **依存:** T1

## Phase 2: DaySummary 機能拡張

### T3: DaySummary に種目名タップ → ExerciseHistory 遷移を追加
- [ ] **TDD**: 種目名を Pressable にして ExerciseHistory への遷移コールバックを呼ぶ
- **ファイル:** `features/calendar/components/DaySummary.tsx`, `features/calendar/screens/CalendarScreen.tsx`
- **内容:**
  1. `ExerciseSetData` 型に `exerciseId: string` フィールドを追加（現状 `exerciseName` のみで `exerciseId` がない）
  2. `fetchDayData` 内で `exerciseData.push()` 時に `exerciseId: we.exercise_id` をセット
  3. DaySummary の Props に `onNavigateToExerciseHistory?: (exerciseId: string, exerciseName: string) => void` を追加
  4. 種目名テキストを `Pressable` でラップ、色を `#4D94FF` に変更
  5. CalendarScreen で `handleNavigateToExerciseHistory` ハンドラーを追加し、`navigation.navigate('ExerciseHistory', { exerciseId, exerciseName })` を実行
- **テスト:** 種目名タップでコールバックが正しい引数（exerciseId, exerciseName）で呼ばれること
- **依存:** なし（Phase 2 タスクは互いに並列可能）
- **並列:** T4, T5 と並列可

### T4: DaySummary に削除ボタン追加
- [ ] **TDD**: ワークアウト削除ボタンと確認ダイアログを追加
- **ファイル:** `features/calendar/components/DaySummary.tsx`, `features/calendar/screens/CalendarScreen.tsx`
- **内容:**
  1. DaySummary の Props に `onDeleteWorkout?: (workoutId: string) => void` を追加
  2. ワークアウト表示エリアの最下部に赤文字「ワークアウトを削除」ボタンを配置
  3. CalendarScreen で `handleDeleteWorkout` ハンドラーを実装:
     - `ConfirmDialog`（`@/shared/components/ConfirmDialog` 既存コンポーネント）で確認
     - 確認後 `WorkoutRepository.delete(workoutId)` 実行
     - 成功トースト表示
     - `refreshKey` state をインクリメントして DaySummary を強制リフレッシュ
  4. DaySummary の Props に `refreshKey?: number` を追加、`useEffect` の依存配列に含めて `fetchDayData()` を再実行
  5. CalendarScreen はカレンダーのマーキング（トレーニング済み日付の印）も再取得
- **テスト:** 削除ボタン表示、確認ダイアログ表示/キャンセル、削除成功後のリフレッシュ（DaySummary が「この日はトレーニングなし」に切り替わること）
- **依存:** なし
- **並列:** T3, T5 と並列可

### T5: DaySummary の日付ヘッダーからタップ遷移を除去
- [ ] **TDD**: 日付ヘッダーの Pressable と ChevronRight を除去し、`onNavigateToDetail` prop を削除
- **ファイル:** `features/calendar/components/DaySummary.tsx`, `features/calendar/screens/CalendarScreen.tsx`
- **内容:**
  1. DaySummary: 日付ヘッダー行から `Pressable` ラッパーと `ChevronRight` アイコンを削除
  2. DaySummary: `onNavigateToDetail` prop を削除
  3. CalendarScreen: `handleNavigateToDetail` ハンドラーと DaySummary への prop 渡しを削除
- **テスト:** 日付ヘッダーがタップ不可であること、ChevronRight が表示されないこと
- **依存:** なし
- **並列:** T3, T4 と並列可

## Phase 3: ナビゲーション再設計

### T6: CalendarScreen に targetDate パラメータ対応を追加
- [ ] **TDD**: CalendarScreen が `targetDate` パラメータを受け取り、`selectedDate` を更新する
- **ファイル:** `types/navigation.ts`, `features/calendar/screens/CalendarScreen.tsx`
- **内容:**
  1. `CalendarStackParamList` の `Calendar` を `{ targetDate?: string } | undefined` に変更
  2. CalendarScreen で `route.params?.targetDate` を監視し、変更時に `selectedDate` を更新
  3. `useEffect` で `route.params?.targetDate` が変わったら `setSelectedDate(targetDate)` を実行
- **テスト:** targetDate パラメータ渡しで selectedDate が更新されること
- **依存:** T3, T4, T5（Phase 2 完了後）
- **並列:** T7 と並列可

### T7: HomeScreen のクロスタブナビゲーション実装
- [ ] **TDD**: 最近のワークアウトカードタップで CalendarTab の該当日付へ遷移
- **ファイル:** `features/home/screens/HomeScreen.tsx`, `types/navigation.ts`
- **内容:**
  1. `handleWorkoutPress` を変更: `completed_at` から日付文字列を算出し `navigation.navigate('CalendarTab', { screen: 'Calendar', params: { targetDate } })` を実行
  2. HomeScreen のナビゲーション型を `CompositeNavigationProp` に更新（HomeStack + MainTab の合成型）
  3. `MainTabParamList` の `CalendarTab` を `NavigatorScreenParams<CalendarStackParamList>` に変更
- **テスト:** カードタップ時に CalendarTab + targetDate パラメータで navigate が呼ばれること
- **依存:** T6
- **並列:** T6 完了後に実行

## Phase 4: クリーンアップ

### T8: WorkoutDetailScreen 削除とルート定義クリーンアップ
- [ ] **TDD**: WorkoutDetailScreen を削除し、全ルート定義から除去
- **ファイル:**
  - `features/workout/screens/WorkoutDetailScreen.tsx`（**削除**）
  - `app/HomeStack.tsx`（WorkoutDetail ルート削除）
  - `app/CalendarStack.tsx`（WorkoutDetail ルート削除）
  - `types/navigation.ts`（WorkoutDetail 型削除）
  - `features/workout/screens/WorkoutDetailScreen.test.tsx`（**削除**）
- **内容:**
  1. WorkoutDetailScreen.tsx を削除
  2. HomeStack / CalendarStack から WorkoutDetail スクリーン定義を削除
  3. HomeStackParamList / CalendarStackParamList から `WorkoutDetail` エントリを削除
  4. `navigation.ts` の `WorkoutDetailScreenProps` / `CalendarWorkoutDetailScreenProps` 型を削除
  5. `WorkoutDetailScreen.test.tsx`（`__tests__/` 配下）を削除
  6. 不要な import の整理（HomeStack, CalendarStack の WorkoutDetailScreen import 等）
- **テスト:** 型チェック（`tsc --noEmit`）がパスすること、既存テストが全てパスすること
- **依存:** T6, T7（Phase 3 完了後）

## タスクサマリー

| Phase | タスク数 | 並列可能 |
|-------|---------|---------|
| Phase 1: DB層 | 2 | 不可（T1 → T2 の順序） |
| Phase 2: DaySummary | 3 | T3, T4, T5 は全て並列可 |
| Phase 3: ナビゲーション | 2 | T6 → T7 の順序 |
| Phase 4: クリーンアップ | 1 | — |
| **合計** | **8** | **Phase 2 の3タスクが並列可** |
