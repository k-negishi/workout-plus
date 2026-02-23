# 実装計画: カレンダーから過去日付のワークアウトを記録

## アーキテクチャ方針

**選択日付の共有方式**: Zustand store（`calendarSelectedDate`）
- 理由: CalendarScreen ↔ FloatingRecordButton はタブ間通信のため、ナビゲーション params は不向き
- 既存の `pendingContinuationWorkoutId` パターンと一貫性がある

**targetDate の受け渡し**: ナビゲーション params（`RecordStackParamList.Record.targetDate`）
- FloatingRecordButton → RecordScreen は単方向の遷移なので params が適切

## 変更の依存関係

```
[T1] WorkoutRepository: findCompletedByDate() 追加 + create() に createdAt オプション
  ↓
[T2] workoutSessionStore: calendarSelectedDate フィールド追加
  ↓
[T3] navigation.ts: RecordStackParamList.Record に targetDate 追加
  ↓
[T4] useWorkoutSession: startSession(workoutId?, targetDate?) 拡張
     + completeWorkout() の completed_at 制御
  ↓
[T5] CalendarScreen: handleDayPress で setCalendarSelectedDate() 呼び出し
[T6] MainTabs.tsx: FloatingRecordButton タブ判定 + 確認ダイアログ + targetDate navigate
  ↓
[T7] RecordScreen: targetDate params 受け取り + ヘッダー日付表示

[T8] テスト: WorkoutRepository.findCompletedByDate
[T9] テスト: FloatingRecordButton（過去日付分岐）
[T10] テスト: useWorkoutSession（targetDate 付き startSession）
```

T5 と T6 は T2 完了後に並列実行可能。
T8〜T10 は対応実装と並列で記述し、実装後に実行。

## 重要な実装ポイント

### 1. targetDate の UNIX ms 変換

```typescript
// 'yyyy-MM-dd' → その日の 00:00:00 JST を UNIX ms で得る
const [year, month, day] = targetDate.split('-').map(Number);
const dateMs = new Date(year, month - 1, day).getTime();
```

### 2. completeWorkout() での completed_at 制御

`useWorkoutSession.completeWorkout()` が `targetDate` を参照できるよう、
store に `sessionTargetDate: string | null` を追加するか、
`completeWorkout(targetDate?: string)` を引数で渡す方式を採用する。

→ **store に持つ方式**を採用（`startSession` 時にセット、完了時に参照）

```typescript
// store: sessionTargetDate
startSession(workoutId?, targetDate?) {
  // targetDate が指定されていれば store.setSessionTargetDate(targetDate)
}
completeWorkout() {
  const targetDate = store.getState().sessionTargetDate;
  const completedAt = targetDate ? dateStringToMs(targetDate) : Date.now();
  // WorkoutRepository.update({ completedAt, status: 'completed' })
}
```

### 3. FloatingRecordButton のタブ判定

`CustomTabBar` の props `state` から `state.routes[state.index].name` でアクティブタブ名を取得。
`FloatingRecordButton` に `activeRouteName: string` を props として渡す。

### 4. 日付フォーマット（`date-fns` 使用可）

```typescript
import { format, parseISO, isToday, isBefore } from 'date-fns';
import { ja } from 'date-fns/locale';
// 'M月d日のワークアウト'
format(parseISO(targetDate), 'M月d日のワークアウト', { locale: ja });
```

既存コードで `date-fns` が使用されているため追加インストール不要。
