# DB カラム設計規約

## 命名規則

| レイヤー | 命名規則 | 例 |
|---------|---------|-----|
| DB カラム名 | snake_case | `created_at`, `muscle_group` |
| Row 型（`database/types.ts`） | snake_case（DB そのまま） | `muscle_group: MuscleGroup` |
| アプリ型（`types/`） | camelCase | `muscleGroup: MuscleGroup` |
| Repository 引数型 | camelCase（アプリ層に合わせる） | `CreateExerciseParams.muscleGroup` |

変換責務は Repository 層に閉じ込める。UI 層は camelCase のみ意識する。

## DB TEXT カラムの格納値

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

## タイムスタンプ

**現在: UNIX ミリ秒（INTEGER）**

```typescript
const now = Date.now(); // 例: 1708600000000
```

TODO: 将来的に ISO 8601 TEXT（`'2026-02-22T10:30:00.000Z'`）への移行を検討。
TEXT 化すると SQLite の `date(col)`, `strftime('%Y-%m-%d', col)` が変換不要で使える。

## Boolean フラグ（is_***）

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

## 計算カラム

Repository 層で自動管理する計算値はアプリ層から直接 UPDATE しない。

```typescript
// estimated_1rm（Epley 式: weight * (1 + reps / 30)）
// → SetRepository.create() / update() が weight/reps 変更時に自動再計算
// → 手動で estimated_1rm を UPDATE してはならない
```

## 外部キーとカスケード削除

```sql
-- 親削除時に子も削除する場合: ON DELETE CASCADE
workout_exercises.workout_id REFERENCES workouts(id) ON DELETE CASCADE

-- 参照整合性を保持したい場合（削除不可）: CASCADE なし
workout_exercises.exercise_id REFERENCES exercises(id)
-- → 使用中の種目を削除しようとすると外部キーエラーになる（意図的）

-- 達成記録を保持したい場合: CASCADE なし（意図的）
personal_records.workout_id REFERENCES workouts(id)
-- → ワークアウト削除後もPR達成記録を残す設計
```

## スキーマドキュメント

`database/schema.ts` の各テーブル定数に JSDoc で以下を記載する:

- テーブルの役割
- 各 `@column` の意味・有効値・NULL 許容の理由・制約の意図
