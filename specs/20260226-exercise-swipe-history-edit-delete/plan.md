# 実装計画: 種目選択スワイプ履歴遷移 + 履歴画面編集・削除

**Feature ID:** 20260226-exercise-swipe-history-edit-delete

---

## アーキテクチャ概要

```
[ExercisePickerScreen]
  └── Swipeable (react-native-gesture-handler)
       └── 「履歴」ボタン → navigate('ExerciseHistory', {...})

[ExerciseHistoryFullScreen]
  ├── ヘッダー右上: ✎ 🗑（isCustom が true の場合のみ）
  ├── ✎ → InlineEditForm（ヘッダー下）
  └── 🗑 → Alert.alert → ExerciseRepository.softDelete → goBack

[ExerciseRepository]
  ├── softDelete(id) → UPDATE exercises SET is_deleted = 1
  ├── restore(id)    → UPDATE exercises SET is_deleted = 0
  └── find*()        → WHERE is_deleted = 0（全クエリに追加）

[DB Migration v7]
  └── ALTER TABLE exercises ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0
```

---

## 依存関係グラフ

```
[T01: DBマイグレーション v7]
    ↓
[T02: 型定義更新 (ExerciseRow / Exercise)]
    ↓
[T03: ExerciseRepository 更新]
    ↓
[T04: ExercisePicker スワイプUI + 既存編集削除]
[T05: ExerciseHistoryFullScreen 編集・削除UI]
    ↓ (T04, T05 並列可)
[T06: ExercisePicker スワイプUI テスト]
[T07: ExerciseHistoryFullScreen テスト]
[T08: ExerciseRepository テスト]
    ↓ (T06, T07, T08 並列可)
[T09: 統合テスト・品質確認]
```

---

## 実装方針の決定理由

### スワイプ実装: `Swipeable` を選択
- **選択肢比較:**
  - A: `Swipeable` from `react-native-gesture-handler`（既存依存）
  - B: `react-native-swipeable-item`（追加依存）
  - C: カスタム PanGestureHandler（実装コスト大）
- **採用理由:** `react-native-gesture-handler ~2.28.0` は既存依存。追加パッケージ不要。`Swipeable` は iOS/Android 共通の swipe action UX を簡潔に実現できる。

### 編集フォーム: インラインフォーム（ExercisePicker から移植）
- ExercisePicker に既存の `InlineEditForm` コンポーネントがあり、UIパターンを流用できる
- `ExerciseHistoryFullScreen` のヘッダー直下に展開する

### 論理削除フラグ: `is_deleted INTEGER NOT NULL DEFAULT 0`
- `deleted_at TIMESTAMP` より `is_deleted 0|1` が一貫性があり既存パターン（`is_custom`, `is_favorite`）と統一
- `restore()` メソッドも実装（UI は将来対応）

### `useExerciseHistory` フック: `exerciseId` を受け取り `isCustom` フラグも取得
- 現在 `useExerciseHistory` は統計データのみ管理。編集後の種目名更新のために `exerciseName` を state 管理に変更するか、ルートパラメータを使うか
- **決定:** 編集・削除は `ExerciseHistoryFullScreen` 内でローカル state 管理。`exerciseId` でリポジトリを直接呼ぶ。`isCustom` は `useExerciseHistory` フックで種目基本情報も返すよう拡張

---

## 変更ファイル詳細

### 1. `apps/mobile/src/database/migrations.ts`
- `LATEST_VERSION = 7` に更新
- `migrateV6ToV7` 関数を追加: `is_deleted` カラム追加（冪等性確保）

### 2. `apps/mobile/src/database/types.ts`
- `ExerciseRow` に `is_deleted: 0 | 1` を追加

### 3. `apps/mobile/src/types/exercise.ts`
- `Exercise` 型に `isDeleted: boolean` を追加

### 4. `apps/mobile/src/database/repositories/exercise.ts`
- `findAll` / `findByCategory` / `findFavorites` / `findCustom` / `search` に `WHERE is_deleted = 0` 追加
- `softDelete(id)` メソッド追加
- `restore(id)` メソッド追加
- `rowToExercise` ヘルパーを抽出して重複排除（任意）

### 5. `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx`
- `Swipeable` import 追加
- `SwipeableExerciseRow` コンポーネントを追加（各行をラップ）
- `renderRightActions` で「履歴」ボタンをレンダリング
- `handleNavigateToHistory(exerciseId, exerciseName)` を追加
- 既存 `InlineEditForm` コンポーネントを削除
- 既存 `handleStartEdit` / `handleSaveEdit` を削除
- 関連 state (`editingExerciseId`, `editName`, `editMuscleGroup`, `editEquipment`) を削除
- `ExerciseItemActions` から `onStartEdit` / `isCustom` props を削除（または編集ボタンを削除）

### 6. `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx`
- `isCustom` を `useExerciseHistory` から取得（または別途 `ExerciseRepository.findById` で取得）
- ヘッダーに ✎ 🗑 アイコンを追加（isCustom の場合のみ）
- `EditForm` コンポーネント（ExercisePicker の InlineEditForm を流用）
- `handleEdit` / `handleSaveEdit` / `handleDelete` を追加
- 削除後に `navigation.goBack()` を呼ぶ

### 7. テストファイル
- `__tests__/exercise.repository.test.ts`: softDelete / restore / findAll フィルタリング
- `__tests__/ExercisePickerScreen.test.tsx`: スワイプ後「履歴」ボタン表示
- `__tests__/ExerciseHistoryFullScreen.test.tsx`: 編集・削除ダイアログ

---

## useExerciseHistory フックの拡張方針

`useExerciseHistory(exerciseId)` に `isCustom` と `exerciseName` を追加返却する。

```typescript
// 現在の返却値
{ stats, weeklyData, prHistory, allHistory, loading }

// 拡張後の返却値
{ stats, weeklyData, prHistory, allHistory, loading, isCustom, exerciseName }
```

実装: フック内で `ExerciseRepository.findById(exerciseId)` を呼ぶ（新規メソッドとして追加）。

---

## リスク・注意事項

1. **`Swipeable` と `SectionList` の組み合わせ:**
   - `SectionList` の各 `renderItem` を `Swipeable` でラップする
   - 複数行のスワイプが同時に開かないよう `ref` で管理（`openedSwipeableRef`）

2. **`ExercisePicker` の `handleSaveEdit` バグ修正:**
   - 保存後に `loadExercises()` が呼ばれていない
   - 編集機能を履歴画面に移管するため、`ExercisePicker` 側は削除でよい

3. **`ExerciseHistoryFullScreen` での `isCustom` 取得:**
   - 現在 `route.params` に `isCustom` が含まれていない
   - 解決策A: `useExerciseHistory` フックで取得（DB アクセス）
   - 解決策B: `route.params` に `isCustom` を追加
   - **採用:** 解決策A（型定義を変えずに済む、フックに閉じ込め）
