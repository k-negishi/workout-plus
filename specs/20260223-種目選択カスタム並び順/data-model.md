# Data Model: 種目選択カスタム並び順

## スキーマ変更

### exercises テーブル（Migration v6）

```sql
-- sort_order カラム追加
ALTER TABLE exercises ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- 既存レコードを登録順（rowid）で初期化
UPDATE exercises SET sort_order = rowid;
```

**設計理由**:
- `NOT NULL` + `DEFAULT 0`: 新規挿入直後にアプリ層で正しい値を設定するためDEFAULT 0は暫定
- 実際の新規種目は `create()` で `MAX(sort_order) + 1` を明示的にセット
- 一意制約なし（保存時バルクUPDATE中の一時的重複を避けるため）

## 型定義変更

### ExerciseRow（DB層）
```typescript
export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  is_custom: 0 | 1;
  is_favorite: 0 | 1;
  created_at: number;
  updated_at: number;
  sort_order: number;  // 追加
};
```

### Exercise（アプリ層）
```typescript
export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  sortOrder: number;  // 追加
};
```

## Repository 変更

### ExerciseRepository.findAll()
```typescript
// 変更前
'SELECT * FROM exercises ORDER BY muscle_group, name'

// 変更後（sort_order ASCで取得）
'SELECT * FROM exercises ORDER BY sort_order ASC'
```

### ExerciseRepository.create() — sort_order 追加
```typescript
// MAX(sort_order) + 1 を取得してからINSERT
const maxRow = await db.getFirstAsync<{ max_sort: number }>(
  'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM exercises'
);
const sortOrder = (maxRow?.max_sort ?? 0) + 1;

await db.runAsync(
  `INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_favorite, created_at, updated_at, sort_order)
   VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
  [id, params.name, params.muscleGroup, params.equipment, now, now, sortOrder],
);
```

### ExerciseRepository.updateSortOrders() — 新規追加
```typescript
async updateSortOrders(orders: { id: string; sortOrder: number }[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const { id, sortOrder } of orders) {
      await db.runAsync(
        'UPDATE exercises SET sort_order = ? WHERE id = ?',
        [sortOrder, id],
      );
    }
  });
}
```

## toExercise 変換関数

```typescript
// sort_order を sortOrder に変換（Repository層の変換責務）
function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isCustom: row.is_custom === 1,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,  // 追加
  };
}
```

注意: 現在`toExercise`は`useExerciseSearch.ts`内で定義されている。
`sortOrder`追加に合わせて同ファイルを更新する。
