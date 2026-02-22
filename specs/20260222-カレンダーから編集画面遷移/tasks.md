# Tasks: カレンダーから編集画面遷移

**Branch**: `20260222-カレンダーから編集画面遷移`
**Total**: 3 tasks | **Parallel**: T01 と T02 は並列実行可

---

## User Story 1: カレンダーから編集画面へ遷移できる

### T01: テストを追加（Red）

**ファイル**: `apps/mobile/src/app/__tests__/CalendarStack.test.tsx`（新規作成）

CalendarStack が WorkoutEdit 画面を持つことを検証するテストを追加する。

- `CalendarStack` を `NavigationContainer` でラップしてレンダリング
- `WorkoutEdit` スクリーンが navigator に存在することを確認
- `WorkoutDetailScreen` から `WorkoutEdit` へのナビゲーションをテスト

**依存**: なし
**並列可**: T02 と並列実行可

---

### T02: CalendarStackParamList に WorkoutEdit を追加（実装）

**ファイル**: `apps/mobile/src/types/navigation.ts`

`CalendarStackParamList` に `WorkoutEdit: { workoutId: string }` を追加する。

```diff
export type CalendarStackParamList = {
  Calendar: undefined;
  WorkoutDetail: { workoutId: string };
+ WorkoutEdit: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};
```

**依存**: なし
**並列可**: T01 と並列実行可

---

### T03: CalendarStack に WorkoutEditScreen を登録（実装 + Green）

**ファイル**: `apps/mobile/src/app/CalendarStack.tsx`

`WorkoutEditScreen` を import して `Stack.Screen` として追加する。

```diff
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
+import { WorkoutEditScreen } from '@/features/workout/screens/WorkoutEditScreen';

 export function CalendarStack() {
   return (
     <Stack.Navigator screenOptions={{ headerShown: false }}>
       <Stack.Screen name="Calendar" component={CalendarScreen} />
       <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
+      <Stack.Screen name="WorkoutEdit" component={WorkoutEditScreen} />
       <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
     </Stack.Navigator>
   );
 }
```

**依存**: T02（型定義の追加が先）
**並列可**: 不可（T02 完了後）

---

## 検証コマンド

```bash
pnpm --filter mobile tsc --noEmit
pnpm --filter mobile test -- --testPathPattern="CalendarStack"
pnpm lint
```
