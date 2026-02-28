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

---

## DB カラム設計規約

### 命名規則

| レイヤー | 命名規則 | 例 |
|---------|---------|-----|
| DB カラム名 | snake_case | `created_at`, `muscle_group` |
| Row 型（`database/types.ts`） | snake_case（DB そのまま） | `muscle_group: MuscleGroup` |
| アプリ型（`types/`） | camelCase | `muscleGroup: MuscleGroup` |
| Repository 引数型 | camelCase（アプリ層に合わせる） | `CreateExerciseParams.muscleGroup` |

変換責務は Repository 層に閉じ込める。UI 層は camelCase のみ意識する。

### DB TEXT カラムの格納値

**snake_case（lowercase）で統一する。**

```sql
-- ✅ 正しい
timer_status TEXT NOT NULL DEFAULT 'not_started'
-- 有効値: 'not_started' | 'running' | 'paused' | 'discarded'

-- ❌ 誤り（camelCase は DB 格納値として不適切）
timer_status TEXT NOT NULL DEFAULT 'notStarted'
```

理由: SQL の WHERE 句で直接比較する際に camelCase は混乱を招く。
他の列挙値（`'running'`, `'paused'` 等）と命名規則を統一する。

### タイムスタンプ

**現在: UNIX ミリ秒（INTEGER）**

```typescript
const now = Date.now(); // 例: 1708600000000
```

TODO: 将来的に ISO 8601 TEXT（`'2026-02-22T10:30:00.000Z'`）への移行を検討。
TEXT 化すると SQLite の `date(col)`, `strftime('%Y-%m-%d', col)` が変換不要で使える。

### Boolean フラグ（is_***）

SQLite に BOOLEAN 型はないため INTEGER 0|1 で代用する。

```typescript
// Row 型: SQLite の実態に合わせて 0 | 1
export type ExerciseRow = {
  is_custom: 0 | 1;
  is_favorite: 0 | 1;
};

// アプリ型: Repository 層で boolean に変換
export type Exercise = {
  isCustom: boolean;
  isFavorite: boolean;
};
```

TODO: `is_custom` は将来的に TEXT enum（`'preset' | 'custom'`）への変更を検討。
      `is_favorite` は boolean 的意味が強いため INTEGER 0|1 のまま維持。

### 計算カラム

Repository 層で自動管理する計算値はアプリ層から直接 UPDATE しない。

```typescript
// estimated_1rm（Epley 式: weight * (1 + reps / 30)）
// → SetRepository.create() / update() が weight/reps 変更時に自動再計算
// → 手動で estimated_1rm を UPDATE してはならない
```

### 外部キーとカスケード削除

```sql
-- 親削除時に子も削除する場合: ON DELETE CASCADE
workout_exercises.workout_id REFERENCES workouts(id) ON DELETE CASCADE

-- 参照整合性を保持したい場合（削除不可）: CASCADE なし
workout_exercises.exercise_id REFERENCES exercises(id)
-- → 使用中の種目を削除しようとすると外部キーエラーになる（意図的）

-- 子レコードを保持しつつ親を削除したい場合: CASCADE なし + アプリ層事前処理
personal_records.workout_id TEXT NOT NULL REFERENCES workouts(id)
-- → NOT NULL + CASCADE なし = 親削除前にアプリ層で子を処理する必要がある
-- → 手順: 影響する子 ID を収集 → 子を削除 → 親を削除 → 子を再計算
```

### スキーマドキュメント

`database/schema.ts` の各テーブル定数に JSDoc で以下を記載する:

- テーブルの役割
- 各 `@column` の意味・有効値・NULL 許容の理由・制約の意図
