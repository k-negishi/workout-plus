# SQLite パターン集

## 子レコードを保持しつつ親を削除する（アプリ層事前処理パターン）

### 問題

`PRAGMA foreign_keys = ON` が有効な状態で、`NOT NULL REFERENCES parent(id)` を持つ子テーブルが存在する場合、親レコードを直接 DELETE するとエラーになる。

```sql
-- このような設計があるとき
personal_records.workout_id TEXT NOT NULL REFERENCES workouts(id)
-- ON DELETE CASCADE / SET NULL なし（子レコードを保持したいため）
```

```typescript
// NG: 外部キー制約違反でエラー
await WorkoutRepository.delete(workoutId);
// → SQLITE_CONSTRAINT: FOREIGN KEY constraint failed
```

### 解決策：アプリ層で削除前に子を処理する

```typescript
// 1. 影響する子レコードの ID を収集（削除後の再計算対象を特定）
const affectedExerciseIds =
  await PersonalRecordRepository.findExerciseIdsByWorkoutId(workoutId);

// 2. 子レコードを先に削除して FK 制約を解除する
await PersonalRecordRepository.deleteByWorkoutId(workoutId);

// 3. 親レコードを削除（CASCADE 設定済みの孫テーブルも連鎖削除される）
await WorkoutRepository.delete(workoutId);

// 4. 残りのレコードから子データを再計算・再挿入する
//    → 削除した親を除いた次点の値が新しいベストになる
for (const exerciseId of affectedExerciseIds) {
  await PersonalRecordRepository.recalculateForExercise(exerciseId);
}
```

### なぜ CASCADE / SET NULL でなくアプリ層か

- `ON DELETE CASCADE` → 子レコードが消える。PRを残したい意図に反する
- `ON DELETE SET NULL` → 子カラムを nullable にする必要があり、型が複雑になる
- **アプリ層事前処理** → 削除前後の状態を明示的に制御できる。「次点を新 PR にする」などドメインロジックをコードで表現できる

### このプロジェクトでの実装

| メソッド | 役割 |
|---|---|
| `PersonalRecordRepository.findExerciseIdsByWorkoutId(workoutId)` | 削除対象 workout を参照している PR の種目 ID を収集 |
| `PersonalRecordRepository.deleteByWorkoutId(workoutId)` | FK 制約解除のため該当 PR を一括削除 |
| `PersonalRecordRepository.recalculateForExercise(exerciseId)` | 残りの completed ワークアウトから PR を再計算（次点が自動的に新 PR になる） |

### 適用箇所

- `CalendarScreen.handleDeleteWorkout()` — 完了済みワークアウトの削除（Issue #194 で対応）

### 注意：recording 状態のワークアウト削除は不要

`completeWorkout()` や `discardWorkout()` で `recording` 状態のワークアウトを削除する場合、
そのワークアウトはまだ `completed` になっていないため PR は参照していない。この処理は不要。
