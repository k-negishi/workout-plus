# Data Model: 当日ワークアウト継続登録

**Date**: 2026-02-22
**Phase**: Phase 1 – 設計

---

## 既存エンティティへの影響

本機能は**新規テーブルなし**。既存スキーマはそのまま使用し、ロジック層でのみ拡張する。

---

## Workout エンティティ（既存 + 状態遷移の拡張）

```
workouts テーブル（既存スキーマ）
├── id: TEXT (ULID)
├── status: TEXT  ← 'recording' | 'completed' | 'discarded'
├── created_at: INTEGER (Unix ms)
├── started_at: INTEGER | NULL
├── completed_at: INTEGER | NULL  ← 継続完了時に更新される
├── timer_status: TEXT
├── elapsed_seconds: INTEGER
├── timer_started_at: INTEGER | NULL
└── memo: TEXT | NULL
```

### 状態遷移（継続モードを追加）

```
                   [新規作成]
                      ↓
              recording (notStarted)
                      ↓ タイマー開始
              recording (recording)
                   ↙       ↘
          discarded        completed
              ↑                ↓ ← 継続モード開始
              |           recording (notStarted) ← ★ 継続モードで再オープン
              |                ↓ 種目追加・セット入力
              |           recording (recording)
              |               ↙       ↘
              └─────────discarded   completed
                    (継続分のみ削除)  (全種目で完了)
```

**継続モード特有の状態**:
- `completed` → `recording` への遷移は**継続モード起動時のみ**
- 継続 discard は partial delete（新規追加種目のみ）+ `recording` → `completed` への戻し

---

## workoutSessionStore の型拡張（ロジック層）

```typescript
// 既存フィールドはそのまま。追加のみ。
type WorkoutSessionState = {
  // [既存フィールド - 変更なし]
  currentWorkout: Workout | null;
  currentExercises: WorkoutExercise[];
  currentSets: Record<string, WorkoutSet[]>;
  timerStatus: TimerStatus;
  elapsedSeconds: number;
  timerStartedAt: number | null;
  invalidationCounter: number;

  // ★ 追加
  // null = 継続モードでない
  // string[] = 継続開始前から存在した workoutExercise.id のリスト
  continuationBaseExerciseIds: string[] | null;
};

// 追加 Actions
type WorkoutSessionActions = {
  // [既存 - 変更なし]
  ...
  // ★ 追加
  setContinuationBaseExerciseIds: (ids: string[] | null) => void;
};
```

---

## WorkoutRepository の拡張

```typescript
// 追加メソッド
findTodayCompleted(): Promise<WorkoutRow | null>
```

**実装仕様**:
```
- 端末ローカル時刻でその日（0:00:00 〜 23:59:59）の範囲を計算
- WHERE status = 'completed' AND completed_at >= dayStart AND completed_at < dayEnd
- ORDER BY completed_at DESC LIMIT 1
- 返り値: 最新の完了済みワークアウット、なければ null
```

---

## ナビゲーション型の拡張

```typescript
// 変更前
export type RecordStackParamList = {
  Record: undefined;
  ...
};

// 変更後
export type RecordStackParamList = {
  Record: { workoutId?: string } | undefined;
  ...
};
```

**RootStackParamList** の `RecordStack` エントリも同様に変更:
```typescript
// 変更前
RecordStack: undefined;

// 変更後
RecordStack: { workoutId?: string } | undefined;
```

---

## +ボタンの判定ロジック（疑似コード）

```
+ボタン onPress:
  1. WorkoutRepository.findRecording() を呼ぶ
     ↓
  [recording あり]
    → navigation.navigate('RecordStack')  // 既存の復帰フロー（パラメータなし）
    return
     ↓
  [recording なし]
  2. WorkoutRepository.findTodayCompleted() を呼ぶ
     ↓
  [today's completed あり]
    → navigation.navigate('RecordStack', { workoutId: todayWorkout.id })
    return
     ↓
  [どちらもなし]
    → navigation.navigate('RecordStack')  // 新規作成フロー
```

---

## startSession の拡張ロジック（疑似コード）

```
startSession(workoutId?: string):
  [Case 1] workoutId が指定されている場合（継続モード）:
    1. WorkoutRepository.findById(workoutId) でワークアウット取得
    2. WorkoutRepository.update(workoutId, { status: 'recording' }) で再オープン
    3. WorkoutExerciseRepository で種目リストを取得
    4. 各種目のセットを取得
    5. store にすべて設定
    6. store.setContinuationBaseExerciseIds([種目IDリスト]) で継続ベースを記録
    7. timerStatus を 'notStarted' に設定（継続時はタイマーリセット）

  [Case 2] workoutId なし、recording セッションあり（既存復帰フロー）:
    → 既存の startSession ロジックそのまま
    ※ この場合 continuationBaseExerciseIds = null のまま

  [Case 3] どちらもなし（新規作成）:
    → 既存の startSession ロジックそのまま
    ※ continuationBaseExerciseIds = null のまま
```

---

## discardWorkout の継続モード処理（疑似コード）

```
discardWorkout():
  [継続モードの場合 (continuationBaseExerciseIds !== null)]:
    1. 現在の種目リストから continuationBaseExerciseIds に含まれない種目を特定
    2. 新規追加種目を WorkoutExerciseRepository.delete() で削除（CASCADE で sets も削除）
    3. WorkoutRepository.update(workoutId, {
         status: 'completed',
         // completed_at は変更しない（元の完了時刻を保持）
       })
    4. store.reset()

  [通常モードの場合 (continuationBaseExerciseIds === null)]:
    → 既存の discardWorkout ロジック（WorkoutRepository.delete() で全削除）
```

---

## 継続モードの復帰（クラッシュ回復）

継続モード中にクラッシュした場合、`status = 'recording'` に戻ったワークアウットが残る。
次回起動時の `startSession()` は既存の `findRecording()` で検出し、通常の復帰フローを実行する。

この時点では `continuationBaseExerciseIds` の情報が失われるが、既存の動作（すべての種目を読み込んで recording 再開）と同じになるため、実用上問題ない。
（ユーザーは再度 discard するか complete するかを選択できる）
