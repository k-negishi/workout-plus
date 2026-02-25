# タスクリスト: 種目選択スワイプ履歴遷移 + 履歴画面編集・削除

**Feature ID:** 20260226-exercise-swipe-history-edit-delete
**総タスク数:** 9
**並列実行可能:** T04/T05 並列、T06/T07/T08 並列

---

## T01: DBマイグレーション v7 追加（is_deleted カラム）

**依存:** なし
**並列可:** なし（後続の全タスクがここに依存）

### 変更対象
- `apps/mobile/src/database/migrations.ts`

### 実装内容
1. `LATEST_VERSION = 6` → `7` に変更
2. `migrateV6ToV7` 関数を追加:
   - PRAGMA table_info で `is_deleted` カラム存在チェック
   - 未存在の場合のみ `ALTER TABLE exercises ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`
3. `MIGRATIONS` マップに `7: migrateV6ToV7` を追加

### TDD手順
- [ ] Red: `migrateV6ToV7` で `is_deleted` が追加されることを確認するテストを書く
- [ ] Green: マイグレーション関数を実装する
- [ ] Refactor: 冪等性（重複実行でエラーが出ない）を確認する

---

## T02: 型定義更新（ExerciseRow / Exercise）

**依存:** T01
**並列可:** なし

### 変更対象
- `apps/mobile/src/database/types.ts`
- `apps/mobile/src/types/exercise.ts`

### 実装内容
1. `ExerciseRow` に `is_deleted: 0 | 1` フィールドを追加（JSDoc: 論理削除フラグ）
2. `Exercise` 型に `isDeleted: boolean` フィールドを追加（JSDoc: 論理削除フラグ）

---

## T03: ExerciseRepository 更新（softDelete/restore/is_deletedフィルタ）

**依存:** T02
**並列可:** なし

### 変更対象
- `apps/mobile/src/database/repositories/exercise.ts`

### 実装内容

#### 3-1. 全 find* クエリに `is_deleted = 0` フィルタ追加
```sql
-- findAll
SELECT * FROM exercises WHERE is_deleted = 0 ORDER BY sort_order ASC

-- findByCategory
SELECT * FROM exercises WHERE muscle_group = ? AND is_deleted = 0 ORDER BY name

-- findFavorites
SELECT * FROM exercises WHERE is_favorite = 1 AND is_deleted = 0 ORDER BY name

-- findCustom
SELECT * FROM exercises WHERE is_custom = 1 AND is_deleted = 0 ORDER BY name

-- search
SELECT * FROM exercises WHERE name LIKE ? AND is_deleted = 0 ORDER BY name
```

#### 3-2. `findById` メソッド追加（ExerciseHistoryFullScreen で isCustom 取得に使用）
```typescript
async findById(id: string): Promise<ExerciseRow | null>
```

#### 3-3. `softDelete` メソッド追加
```typescript
async softDelete(id: string): Promise<void>
// UPDATE exercises SET is_deleted = 1, updated_at = ? WHERE id = ?
```

#### 3-4. `restore` メソッド追加
```typescript
async restore(id: string): Promise<void>
// UPDATE exercises SET is_deleted = 0, updated_at = ? WHERE id = ?
```

#### 3-5. rowToExercise ヘルパー関数を追加して row→Exercise 変換を一元化
```typescript
function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isCustom: row.is_custom === 1,
    isFavorite: row.is_favorite === 1,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
  };
}
```
※ 現在各メソッドで直接 `ExerciseRow` を返しているが、アプリ層での変換は `useExerciseSearch` フック等が担っているため、Repository は引き続き `ExerciseRow` を返すことにして `rowToExercise` は不要（既存パターン維持）

### TDD手順
- [ ] Red: softDelete / restore / findAll フィルタリング / findById のテストを書く
- [ ] Green: 各メソッドを実装する
- [ ] Refactor: クエリの重複を確認・整理する

---

## T04: ExercisePickerScreen 更新（スワイプUI追加・既存編集削除）

**依存:** T03
**並列可:** T05 と並列可

### 変更対象
- `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx`

### 実装内容

#### 4-1. 既存インライン編集を削除
- `InlineEditForm` コンポーネント全体を削除
- `handleStartEdit` / `handleSaveEdit` 関数を削除
- 以下の state を削除:
  - `editingExerciseId`
  - `editName`
  - `editMuscleGroup`（新規作成フォームとは別、編集用）
  - `editEquipment`（新規作成フォームとは別、編集用）
- `ExerciseItemActions` から `onStartEdit` / `isCustom` props を削除し、編集ボタンを削除
- renderItem から `isEditing` / `InlineEditForm` 表示ロジックを削除

#### 4-2. スワイプUIを追加
```typescript
import { Swipeable } from 'react-native-gesture-handler';

// 開いているスワイプ行を1つだけ管理（他の行タップで閉じる）
const openedSwipeableRef = useRef<Swipeable | null>(null);

// 「履歴」ボタンのrenderRightActions
function renderRightActions(exerciseId: string, exerciseName: string) {
  return (
    <TouchableOpacity
      onPress={() => {
        openedSwipeableRef.current?.close();
        navigation.navigate('ExerciseHistory', { exerciseId, exerciseName });
      }}
      style={swipeStyles.historyButton}
    >
      <Text style={swipeStyles.historyButtonText}>📊{'\n'}履歴</Text>
    </TouchableOpacity>
  );
}

// 各行を Swipeable でラップ
<Swipeable
  ref={(ref) => {
    // 開いた時に前の行を閉じる
    if (ref) openedSwipeableRef.current?.close();
    openedSwipeableRef.current = ref;
  }}
  renderRightActions={() => renderRightActions(item.id, item.name)}
  overshootRight={false}
>
  <TouchableOpacity onPress={() => handleSelectExercise(item)} ...>
    ...
  </TouchableOpacity>
</Swipeable>
```

スワイプボタンスタイル:
```typescript
const swipeStyles = StyleSheet.create({
  historyButton: {
    width: 72,
    backgroundColor: '#E6F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4D94FF',
    textAlign: 'center',
  },
});
```

### TDD手順
- [ ] Red: スワイプ後「履歴」ボタンが表示されるテストを書く
- [ ] Green: Swipeable を実装する
- [ ] Refactor: complexity チェック（ESLint 上限 10）

---

## T05: ExerciseHistoryFullScreen 更新（編集・削除UI）

**依存:** T03
**並列可:** T04 と並列可

### 変更対象
- `apps/mobile/src/features/exercise/hooks/useExerciseHistory.ts`
- `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx`

### 実装内容

#### 5-1. `useExerciseHistory` フック拡張
```typescript
// 返却値に isCustom と exerciseName（編集後の更新値）を追加
const { stats, weeklyData, prHistory, allHistory, loading, isCustom } = useExerciseHistory(exerciseId);
// ExerciseRepository.findById で isCustom を取得
```

#### 5-2. `ExerciseHistoryFullScreen` にローカル state 追加
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editName, setEditName] = useState(exerciseName); // route.params の初期値
const [editMuscleGroup, setEditMuscleGroup] = useState<MuscleGroup>('chest');
const [editEquipment, setEditEquipment] = useState<Equipment>('barbell');
const [displayName, setDisplayName] = useState(exerciseName); // 保存後の更新表示用
```

#### 5-3. ヘッダーに編集・削除アイコン追加（isCustom の場合のみ）
```tsx
{/* isCustom の場合のみ編集・削除アイコンを表示 */}
{isCustom && (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <Pressable onPress={handleStartEdit} ...>
      <Text style={{ fontSize: 18 }}>✎</Text>
    </Pressable>
    <Pressable onPress={handleDelete} ...>
      <Text style={{ fontSize: 18 }}>🗑</Text>
    </Pressable>
  </View>
)}
```

#### 5-4. `handleStartEdit` / `handleSaveEdit` / `handleDelete` 実装
```typescript
// 編集開始: フック or Repository から現在値を取得してフォームにセット
const handleStartEdit = useCallback(async () => {
  const row = await ExerciseRepository.findById(exerciseId);
  if (!row) return;
  setEditMuscleGroup(row.muscle_group);
  setEditEquipment(row.equipment);
  setIsEditing(true);
}, [exerciseId]);

// 保存
const handleSaveEdit = useCallback(async () => {
  if (!editName.trim()) return;
  await ExerciseRepository.update(exerciseId, {
    name: editName.trim(),
    muscle_group: editMuscleGroup,
    equipment: editEquipment,
  });
  setDisplayName(editName.trim());
  setIsEditing(false);
}, [exerciseId, editName, editMuscleGroup, editEquipment]);

// 削除
const handleDelete = useCallback(() => {
  Alert.alert(
    `${displayName}を削除しますか？`,
    '削除後も過去のワークアウト記録は残ります。',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await ExerciseRepository.softDelete(exerciseId);
          navigation.goBack();
        },
      },
    ],
  );
}, [displayName, exerciseId, navigation]);
```

#### 5-5. インライン編集フォームコンポーネント
- ExercisePicker の `InlineEditForm` を同等のスタイルで実装
- ヘッダー下に展開する

### TDD手順
- [ ] Red: 編集・削除ダイアログのテストを書く
- [ ] Green: UI と ハンドラを実装する
- [ ] Refactor: complexity チェック

---

## T06: ExercisePickerScreen テスト

**依存:** T04
**並列可:** T07, T08 と並列可

### テストファイル
- `apps/mobile/src/features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx`（既存）

### テストケース
- [ ] スワイプアクションで「履歴」ボタンが表示される
- [ ] 「履歴」ボタンタップで ExerciseHistory へ navigate される
- [ ] 行タップによる種目選択は変更なし（single モード）
- [ ] 行タップによる種目選択は変更なし（multi モード）
- [ ] 編集ボタン（✎）が表示されない（削除確認）

---

## T07: ExerciseHistoryFullScreen テスト

**依存:** T05
**並列可:** T06, T08 と並列可

### テストファイル
- `apps/mobile/src/features/exercise/screens/__tests__/ExerciseHistoryFullScreen.test.tsx`（新規）

### テストケース
- [ ] カスタム種目: ✎ 🗑 アイコンが表示される
- [ ] プリセット種目: ✎ 🗑 アイコンが表示されない
- [ ] ✎ タップで編集フォームが表示される
- [ ] 保存でフォームが閉じてヘッダー種目名が更新される
- [ ] 🗑 タップで確認ダイアログが表示される
- [ ] 削除後に goBack が呼ばれる

---

## T08: ExerciseRepository テスト

**依存:** T03
**並列可:** T06, T07 と並列可

### テストファイル
- `apps/mobile/src/database/repositories/__tests__/exercise.test.ts`（新規または既存）

### テストケース
- [ ] `softDelete` で `is_deleted = 1` になる
- [ ] `restore` で `is_deleted = 0` になる
- [ ] `findAll` で `is_deleted = 1` の行が除外される
- [ ] `findAll` で `is_deleted = 0` の行は含まれる
- [ ] `findById` で存在する行が取得できる
- [ ] `findById` で存在しない行は null を返す
- [ ] `search` で論理削除済み種目は検索結果に含まれない

---

## T09: 統合確認・品質チェック

**依存:** T06, T07, T08
**並列可:** なし

### チェックリスト
- [ ] `pnpm --filter mobile tsc --noEmit` でエラーなし
- [ ] `pnpm lint` でエラーなし
- [ ] `pnpm --filter mobile test` で全テスト PASS
- [ ] `pnpm --filter mobile test --coverage` でカバレッジ確認
- [ ] 手動確認: スワイプ → 履歴遷移
- [ ] 手動確認: カスタム種目の編集・保存
- [ ] 手動確認: カスタム種目の削除 → リストから消える
- [ ] 手動確認: プリセット種目に編集・削除アイコンなし
