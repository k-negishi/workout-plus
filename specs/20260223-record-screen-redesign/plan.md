# 実装計画: RecordScreen 再設計

## アーキテクチャ判断

### 1. RecordScreen の配置戦略
**決定: HomeStack / CalendarStack に RecordScreen ごとスタックを組み込む**

RecordStack を廃止し、HomeStack と CalendarStack の両方に以下を追加する：
```
Home   → Record → ExercisePicker → ExerciseHistory → WorkoutSummary
Calendar → WorkoutDetail → Record → ExercisePicker → ExerciseHistory → WorkoutSummary
```

理由: RecordScreen はスタック画面になるため navigate away でアンマウントされる。
タブ遷移の複雑さ（`navigate('RecordTab' as never)`）が不要になる。

### 2. startSession API 変更
**決定: オプションオブジェクトに変更**

```typescript
// Before
startSession(workoutId?: string, targetDate?: string)

// After
startSession(options?: { workoutId?: string; targetDate?: string })
```

既存の呼び出し箇所は少なく、すべて同ファイル内（RecordScreen）なので変更コストが低い。

### 3. pendingContinuationWorkoutId の廃止
RecordScreen がスタック遷移になるため、直接 route.params で workoutId を渡せる。
Zustand store からこのフィールドを削除し、ストア依存を減らす。

### 4. レイアウトスタイルの方針
ExerciseBlock / SetRow の既存実装が NativeWind className を使用しているため、
変更後も NativeWind className を継続使用する（inline style への変換は本 Issue のスコープ外）。

## 変更ファイル一覧

### 削除
- `apps/mobile/src/app/RecordStack.tsx`
- `apps/mobile/src/features/workout/screens/WorkoutEditScreen.tsx`

### 変更（コンポーネント・UI）
- `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` - カードデザイン適用
- `apps/mobile/src/features/workout/components/SetRow.tsx` - NumericInput → TextInput
- `apps/mobile/src/features/workout/screens/RecordScreen.tsx` - スタック画面化、params 拡張

### 変更（ナビゲーション）
- `apps/mobile/src/app/MainTabs.tsx` - 4タブ化、FloatingRecordButton 削除
- `apps/mobile/src/app/HomeStack.tsx` - Record/ExercisePicker/ExerciseHistory/WorkoutSummary 追加
- `apps/mobile/src/app/CalendarStack.tsx` - 同上
- `apps/mobile/src/types/navigation.ts` - 型定義更新

### 変更（画面）
- `apps/mobile/src/features/home/screens/HomeScreen.tsx` - 記録ボタン・記録中バナー追加
- `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx` - 編集ボタン追加
- `apps/mobile/src/features/workout/screens/WorkoutDetailScreen.tsx` - 続きを記録 → 編集

### 変更（ロジック）
- `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` - startSession API 変更
- `apps/mobile/src/stores/workoutSessionStore.ts` - pendingContinuationWorkoutId 削除

### 変更（テスト）
- `apps/mobile/src/app/__tests__/MainTabs.test.tsx`
- `apps/mobile/src/features/workout/screens/__tests__/RecordScreen.test.tsx`
- `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.test.ts`
- `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.edit.test.ts`

## 実装順序（依存関係）

```
Phase 1: UIコンポーネント刷新（独立・並列可）
  T01: ExerciseBlock カードデザイン適用
  T02: SetRow NumericInput → TextInput 化

Phase 2: ロジック層変更（Phase 1 後）
  T03: useWorkoutSession startSession API 変更
  T04: workoutSessionStore pendingContinuationWorkoutId 削除

Phase 3: ナビゲーション再設計（Phase 2 後）
  T05: navigation.ts 型定義更新
  T06: HomeStack / CalendarStack に Record フロー追加
  T07: MainTabs 4タブ化・FloatingRecordButton 廃止
  T08: RecordStack 廃止

Phase 4: 画面変更（Phase 3 後）
  T09: RecordScreen スタック画面化・params 拡張
  T10: HomeScreen 記録ボタン・バナー追加
  T11: CalendarScreen 編集ボタン追加
  T12: WorkoutDetailScreen 「続きを記録」→「編集」
  T13: WorkoutEditScreen 廃止
```

## リスクと対策

| リスク | 対策 |
|--------|------|
| ExercisePicker / WorkoutSummary が RecordStack に依存している | HomeStack / CalendarStack に移動する際に型定義を更新する |
| `navigate('RecordTab' as never)` の呼び出しが他にも潜んでいる可能性 | 実装前に全 grep で確認 |
| pendingContinuationWorkoutId を参照している箇所の見落とし | store フィールド削除後のコンパイルエラーで検出 |
| WorkoutSummary 遷移時のスタック参照 | RecordScreen の completeWorkout が WorkoutSummary に navigate する箇所を更新 |
