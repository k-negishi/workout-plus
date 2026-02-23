# タスク一覧: カレンダーから過去日付のワークアウトを記録

## サマリー

- 総タスク数: 10
- 並列実行可能: T5 + T6（T2完了後）、T8〜T10（各実装と並列作業可能）

---

## タスク一覧

### T1: WorkoutRepository に findCompletedByDate() 追加 + create() に createdAt オプション追加

- **ファイル**: `apps/mobile/src/database/repositories/workout.ts`
- **依存**: なし
- **並列**: T2, T3 と並列可

#### 変更内容

1. `findCompletedByDate(dateString: string): Promise<WorkoutRow | null>`
   - `findTodayCompleted()` と同様のロジックで、引数の日付文字列 `'yyyy-MM-dd'` から dayStart/dayEnd を計算
   - `WHERE completed_at >= ? AND completed_at < ? AND status = 'completed'`

2. `create()` の引数型に `createdAt?: number` を追加
   - 省略時は `Date.now()`、指定時はその値を `created_at` に使用

#### TDD

- [ ] テスト: `findCompletedByDate('2026-02-14')` が対象日の completed ワークアウトを返す
- [ ] テスト: 対象日にワークアウトがない場合 null を返す
- [ ] テスト: `create({ createdAt: 特定ms })` が指定値で保存される

---

### T2: workoutSessionStore に calendarSelectedDate + sessionTargetDate フィールド追加

- **ファイル**: `apps/mobile/src/stores/workoutSessionStore.ts`
- **依存**: なし
- **並列**: T1, T3 と並列可

#### 変更内容

```typescript
// 追加フィールド
calendarSelectedDate: string | null;           // CalendarScreen の選択日付
setCalendarSelectedDate: (date: string | null) => void;

sessionTargetDate: string | null;              // 進行中セッションの対象日付
setSessionTargetDate: (date: string | null) => void;
```

`resetSession()` 時に `sessionTargetDate` を null にクリアする。

---

### T3: navigation.ts に targetDate 型追加

- **ファイル**: `apps/mobile/src/types/navigation.ts`
- **依存**: なし
- **並列**: T1, T2 と並列可

#### 変更内容

```typescript
// 変更前
RecordStackParamList: { Record: undefined; ... }

// 変更後
RecordStackParamList: { Record: { targetDate?: string } | undefined; ... }
```

---

### T4: useWorkoutSession を startSession(workoutId?, targetDate?) に拡張

- **ファイル**: `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts`
- **依存**: T1, T2
- **並列**: T5, T6 と並列可（T2完了後）

#### 変更内容

1. `startSession(workoutId?: string, targetDate?: string)` にシグネチャ拡張
   - `targetDate` が指定されていれば `store.setSessionTargetDate(targetDate)`
   - 新規作成時: `WorkoutRepository.create({ createdAt: dateStringToMs(targetDate) })`
   - 継続モード（workoutId指定）時: targetDate はタイムスタンプ変更に使わない（既存データ保持）

2. `completeWorkout()` を修正
   - `store.getState().sessionTargetDate` を参照
   - `completedAt = targetDate ? dateStringToMs(targetDate) : Date.now()`
   - `WorkoutRepository.update({ completedAt, status: 'completed' })`

3. ヘルパー関数 `dateStringToMs(dateString: string): number` を追加
   - `'yyyy-MM-dd'` → その日の 00:00:00 JST の UNIX ms

#### TDD

- [ ] テスト: `startSession(undefined, '2026-02-14')` で新規ワークアウトの `created_at` が 2/14 の ms
- [ ] テスト: `completeWorkout()` 時、sessionTargetDate が '2026-02-14' なら `completed_at` が 2/14 の ms
- [ ] テスト: sessionTargetDate が null なら `completed_at` が Date.now() に近い値

---

### T5: CalendarScreen で setCalendarSelectedDate() を呼び出す

- **ファイル**: `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx`
- **依存**: T2
- **並列**: T6 と並列可

#### 変更内容

```typescript
const store = useWorkoutSessionStore();

const handleDayPress = (dateString: string) => {
  setSelectedDate(dateString);
  store.setCalendarSelectedDate(dateString);  // 追加
};
```

画面アンマウント時（他タブへ移動時）は store をクリアしない
（FloatingRecordButton がカレンダータブ判定でのみ参照するため）

---

### T6: FloatingRecordButton にタブ判定 + 確認ダイアログ追加

- **ファイル**: `apps/mobile/src/app/MainTabs.tsx`
- **依存**: T2, T3
- **並列**: T5 と並列可

#### 変更内容

1. `FloatingRecordButton` に `activeRouteName: string` props を追加
2. `handlePress()` に過去日付分岐を追加:

```typescript
const handlePress = async () => {
  const recording = await WorkoutRepository.findRecording();
  if (recording) {
    navigation.navigate('RecordTab' as never);
    return;
  }

  const storeState = useWorkoutSessionStore.getState();
  const selectedDate = storeState.calendarSelectedDate;
  const isCalendarTab = activeRouteName === 'CalendarTab';
  const today = format(new Date(), 'yyyy-MM-dd');
  const isPastDate = selectedDate && isBefore(parseISO(selectedDate), parseISO(today));

  if (isCalendarTab && isPastDate) {
    // 確認ダイアログ
    const label = format(parseISO(selectedDate), 'M月d日', { locale: ja });
    Alert.alert('', `${label}のワークアウトを記録しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '記録する',
        onPress: async () => {
          const existingWorkout = await WorkoutRepository.findCompletedByDate(selectedDate);
          if (existingWorkout) {
            storeState.setPendingContinuationWorkoutId(existingWorkout.id);
          }
          navigation.navigate('RecordTab', { screen: 'Record', params: { targetDate: selectedDate } } as never);
        },
      },
    ]);
    return;
  }

  // 従来ロジック
  const todayWorkout = await WorkoutRepository.findTodayCompleted();
  if (todayWorkout) {
    storeState.setPendingContinuationWorkoutId(todayWorkout.id);
  }
  navigation.navigate('RecordTab' as never);
};
```

3. `CustomTabBar` から `FloatingRecordButton` に `activeRouteName={state.routes[state.index].name}` を渡す

---

### T7: RecordScreen に targetDate params 受け取り + ヘッダー日付表示追加

- **ファイル**: `apps/mobile/src/features/workout/screens/RecordScreen.tsx`
- **依存**: T3, T4
- **並列**: なし

#### 変更内容

1. `useRoute()` で `targetDate` を取得

```typescript
const route = useRoute<RouteProp<RecordStackParamList, 'Record'>>();
const targetDate = route.params?.targetDate;
```

2. `useFocusEffect` 内で `targetDate` を `startSession` に渡す

```typescript
void session.startSession(pendingId ?? undefined, targetDate);
// または新規の場合:
void session.startSession(undefined, targetDate);
```

3. ヘッダー日付表示コンポーネント追加（TimerBar の上）

```tsx
const headerDate = targetDate ?? format(new Date(), 'yyyy-MM-dd');
const dateLabel = format(parseISO(headerDate), 'M月d日のワークアウト', { locale: ja });

// JSX
<View style={styles.dateHeader}>
  <Text style={styles.dateHeaderText}>{dateLabel}</Text>
</View>
```

スタイル:
```typescript
dateHeader: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#e2e8f0',
  backgroundColor: '#ffffff',
},
dateHeaderText: {
  fontSize: 13,
  fontWeight: '500',
  color: '#475569',
},
```

---

### T8: WorkoutRepository テスト

- **ファイル**: `apps/mobile/src/__tests__/repositories/workout.test.ts` (新規)
- **依存**: T1
- **TDD**: T1 実装前にテスト記述

---

### T9: FloatingRecordButton テスト

- **ファイル**: `apps/mobile/src/__tests__/components/FloatingRecordButton.test.tsx` (新規)
- **依存**: T6
- **TDD**: T6 実装前にテスト記述

テスト項目:
- [ ] カレンダータブ + 過去日付選択 → Alert.alert が呼ばれる
- [ ] カレンダータブ + 今日選択 → Alert.alert は呼ばれない
- [ ] ホームタブ + 過去日付選択 → Alert.alert は呼ばれない

---

### T10: useWorkoutSession テスト（targetDate 対応）

- **ファイル**: 既存の `useWorkoutSession.test.ts` に追記
- **依存**: T4
- **TDD**: T4 実装前にテスト記述

---

## 実行順序

```
並列グループ1（依存なし）: T1, T2, T3
並列グループ2（T1+T2完了後）: T4, T5, T6
順次: T7（T3+T4完了後）
テスト実行: T8（T1後）, T9（T6後）, T10（T4後）
```
