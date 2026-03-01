# SQLite パターン集

## `INSERT OR IGNORE` の後に FK 参照してはならない

### 問題：沈黙は成功ではない

`INSERT OR IGNORE` は UNIQUE / NOT NULL / PK 制約違反を**静かにスキップ**するが、
**FK 制約は抑制しない**。スキップされた行の ID を子テーブルの FK として使うと
`FOREIGN KEY constraint failed` になる。

```typescript
// NG: INSERT がスキップされた場合に FK エラー
await db.execAsync(
  `INSERT OR IGNORE INTO workouts (id, workout_date, ...) VALUES ('dev-001', '2026-01-01', ...)`
);
// ↑ workout_date が UNIQUE 競合 → 静かにスキップ。エラーなし。

await db.execAsync(
  `INSERT INTO workout_exercises (workout_id, ...) VALUES ('dev-001', ...)`
);
// ↑ 'dev-001' は workouts に存在しない → FOREIGN KEY constraint failed!
```

**なぜ起きるか**: `OR IGNORE` は「例外なし」を保証するだけで「挿入成功」を保証しない。
呼び出し側は INSERT の成否を知らないまま次の処理に進む。これがバグの本質。

---

### 解決策：モバイル SQLite（シングルライター）では Pattern C を使う

```typescript
// ✅ Pattern C（推奨）: SELECT → 条件分岐 → INSERT
// 存在確認を先に行い、INSERT 前に行の存在を保証する。
const existing = await db.getFirstAsync<{ id: string }>(
  `SELECT id FROM workouts WHERE id = ?`, [workoutId]
);
if (!existing) {
  await db.runAsync(`INSERT INTO workouts (id, ...) VALUES (?)`, [workoutId, ...]);
}
// この時点で行の存在が保証されている → FK 参照しても安全
await db.runAsync(`INSERT INTO workout_exercises (workout_id, ...) VALUES (?)`, [workoutId, ...]);
```

**なぜ Pattern C か**: 意図が自己説明的で、FK 保証が構造的に得られる。
競合状態（TOCTOU）の心配がないシングルライター環境では往復 1 回増えるだけでデメリットなし。

---

### Pattern C を使えない場合（高並列システム）

並列書き込みがある環境では TOCTOU 問題が発生するため、
`INSERT OR IGNORE` + `changes()` チェック（アトミック）を使う:

```typescript
// ✅ Pattern A: changes() で成否を確認（並列環境向け）
await db.runAsync(`INSERT OR IGNORE INTO workouts (id, ...) VALUES (?)`, [workoutId, ...]);
const { changes } = await db.getFirstAsync<{ changes: number }>(`SELECT changes() as changes`);
if (changes === 0) return; // スキップされた → 子テーブルへの INSERT も中止
await db.runAsync(`INSERT INTO workout_exercises (workout_id, ...) VALUES (?)`, [workoutId, ...]);
```

モバイルアプリのローカル SQLite は完全シングルライターなので、**Pattern C 一択**。

---

### チェックリスト

```
INSERT OR IGNORE の後に FK 参照する実装を書く前に確認:

□ INSERT がスキップされた場合の分岐を明示しているか？
□ 子テーブルへの INSERT が「親が存在する前提」になっていないか？
□ モバイル SQLite（シングルライター）か高並列システムか？
  → モバイル: Pattern C（SELECT → 条件分岐 → INSERT）
  → 高並列: Pattern A（INSERT OR IGNORE + changes() チェック）
```

---

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

---

## ビジネスロジック関数と SQL WHERE 句の同期契約

### 問題

TypeScript のビジネスロジック関数（例: `WorkoutPolicy.isValidSet()`）と
Repository 層の SQL WHERE 句（例: `VALID_SET_SQL`）は「別ファイル・別言語」で管理されるため、
どちらかを変更してももう一方を変更し忘れてもコンパイルエラーにならない。
結果として「TS の計算結果と DB の集計結果が食い違う」サイレントバグになる。

```typescript
// NG: 同じ条件を2箇所に散在させる
// useWorkoutSession.ts
const isValid = set.weight != null && set.reps != null && set.reps > 0;

// workout.ts (Repository)
const sql = `... WHERE s.weight IS NOT NULL AND s.reps IS NOT NULL AND s.reps >= 1`;
// → 条件の微妙な違い（> 0 vs >= 1）に気づけない
```

### 解決策：定数で一元管理 + パラメタライズドテストで同期を保証

```typescript
// domain/workout/WorkoutPolicy.ts（単一の真実）
export const WorkoutPolicy = {
  isValidSet(set: { weight: number | null; reps: number | null }): boolean {
    return set.weight != null && set.reps != null && set.reps > 0;
  },
} as const;

// database/repositories/workout.ts（SQL 版：WorkoutPolicy と一致させる）
export const VALID_SET_SQL =
  's.weight IS NOT NULL AND s.reps IS NOT NULL AND s.reps > 0';
```

```typescript
// domain/workout/__tests__/WorkoutPolicy.test.ts（同期契約テスト）
// WorkoutPolicy.isValidSet と VALID_SET_SQL が同じ真理値表を持つことを保証する
const cases: Array<[string, { weight: number | null; reps: number | null }, boolean]> = [
  ['weight=60 reps=8',   { weight: 60, reps: 8 },   true],
  ['weight=0 reps=8',    { weight: 0,  reps: 8 },   true],   // 0kg は有効（自重等）
  ['weight=60 reps=0',   { weight: 60, reps: 0 },   false],  // reps=0 は無効
  ['weight=null reps=8', { weight: null, reps: 8 },  false],
  ['weight=60 reps=null',{ weight: 60, reps: null }, false],
  ['weight=null reps=null', { weight: null, reps: null }, false],
];

it.each(cases)('%s → %s', (_label, set, expected) => {
  expect(WorkoutPolicy.isValidSet(set)).toBe(expected);
});
```

**SQL 側は Repository テストで別途担保する（DB から取得した結果が期待通りか検証）。**
パラメタライズドテストは「TS と SQL の条件が同一の論理かどうか」をドキュメントとして示す役割も担う。

### なぜ SQL に直接 WorkoutPolicy を呼ばないか

expo-sqlite は JavaScript 関数をカスタム SQL 関数として登録できない。
そのため「TS の関数を SQL 内で呼ぶ」ことはできず、条件を SQL 文字列として複製するしかない。
同期テストはこの避けられない複製の「ズレ検知装置」として機能する。

### このプロジェクトでの実装

| シンボル | 定義場所 | 用途 |
|---|---|---|
| `WorkoutPolicy.isValidSet()` | `src/domain/workout/WorkoutPolicy.ts` | TS 層（有効セット判定・クリーンアップ） |
| `VALID_SET_SQL` | `src/database/repositories/workout.ts` | SQL 層（`findTodayActiveRecording` の WHERE 句） |
| 同期テスト | `src/domain/workout/__tests__/WorkoutPolicy.test.ts` | 両者が同じ真理値表を持つことを保証 |

---

### スキーマドキュメント

`database/schema.ts` の各テーブル定数に JSDoc で以下を記載する:

- テーブルの役割
- 各 `@column` の意味・有効値・NULL 許容の理由・制約の意図
