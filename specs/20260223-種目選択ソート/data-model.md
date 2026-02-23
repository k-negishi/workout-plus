# Data Model: 種目選択ソート

## 新規型定義

### SortOrder（ソート種別）

```typescript
// apps/mobile/src/types/exerciseSort.ts (新規)
export type ExerciseSortOrder =
  | 'name'       // 名前順（デフォルト）
  | 'muscle'     // 部位別
  | 'date'       // 追加日順（新しい順）
  | 'frequency'; // よく使う順
```

### ExerciseWithUsage（使用回数付き種目）

```typescript
// 既存の Exercise 型を拡張（Repository 内部利用のみ）
export type ExerciseWithUsage = Exercise & {
  usageCount: number; // ワークアウト内での使用回数合計
};
```

## 既存型の変更

### exerciseStore の状態拡張

```typescript
// apps/mobile/src/stores/exerciseStore.ts
// 追加するフィールド:
sortOrder: ExerciseSortOrder;        // 現在選択中のソート順（デフォルト: 'name'）
setSortOrder: (order: ExerciseSortOrder) => void; // ソート切り替えアクション
```

## DB変更

### スキーマ変更: なし

既存スキーマで「よく使う順」算出に必要なデータは `workout_exercises` テーブルに存在する。

## Repositoryの変更

### ExerciseRepository（追加メソッド）

```typescript
// apps/mobile/src/database/repositories/exercise.ts
findAllWithUsageCount(): Promise<ExerciseWithUsage[]>
```

実行SQL:
```sql
SELECT
  e.*,
  COUNT(we.exercise_id) AS usage_count
FROM exercises e
LEFT JOIN workout_exercises we ON e.id = we.exercise_id
GROUP BY e.id
ORDER BY usage_count DESC, e.name ASC
```

## セクション構造の変更

### useExerciseSearch（変更）

`computeSections()` 関数に `sortOrder: ExerciseSortOrder` 引数を追加し、ソートロジックを分岐する。

| sortOrder | セクション構造 |
|-----------|--------------|
| `'name'`  | お気に入り / マイ種目 / 部位別（各セクション内は名前順） ← 現状維持 |
| `'muscle'`| 部位別のみ（お気に入り・マイ種目セクションなし、各セクション内は名前順） |
| `'date'`  | セクションなし（フラットリスト、created_at降順） |
| `'frequency'` | セクションなし（フラットリスト、usageCount降順 → name昇順） |

## エンティティ関連図

```
exerciseStore
  ├── exercises: Exercise[]     （既存）
  ├── sortOrder: ExerciseSortOrder （追加）
  └── sortedExercises: 計算値（useExerciseSearchで使用）

ExerciseRepository
  ├── findAll()                  （既存、name/muscle ソート用）
  ├── findAllWithUsageCount()    （追加、frequencyソート用）
  └── （他の既存メソッドは変更なし）

useExerciseSearch
  ├── 引数: exercises, query, selectedCategory, sortOrder （sortOrder追加）
  └── computeSections(): ExerciseSection[] （sortOrderで分岐）
```
