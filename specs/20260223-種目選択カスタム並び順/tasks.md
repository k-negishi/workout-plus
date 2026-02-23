# Tasks: 種目選択カスタム並び順

## Phase 1: DB・型・Repository 基盤

### TDD Red（テスト先行）

- [x] T001 [DB] `apps/mobile/src/database/__tests__/migrations.test.ts` に Migration v6 のテストを追加する（Red）
  - `sort_order` カラムが追加されること
  - 既存レコードに `rowid` が設定されること
  - 冪等性（再実行でエラーにならないこと）

- [x] T002 [Repo] `apps/mobile/src/database/repositories/__tests__/exercise.test.ts` に以下のテストを追加する（Red）
  - `findAll()` が `sort_order ASC` で返すこと
  - `create()` が `MAX(sort_order) + 1` を設定すること
  - `updateSortOrders()` が複数件を一括更新すること

### Implementation

- [x] T003 [DB] Migration v6 を実装する（`migrations.ts`）
  - `LATEST_VERSION = 6` に更新
  - `migrateV5ToV6()` 関数: `ALTER TABLE exercises ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0` + `UPDATE exercises SET sort_order = rowid`
  - 冪等性対応: `PRAGMA table_info` で存在チェック

- [x] T004 [Schema] `apps/mobile/src/database/schema.ts` の `CREATE_EXERCISES_TABLE` に `sort_order` カラムを追加する（新規インストール用）

- [x] T005 [Type] `apps/mobile/src/database/types.ts` の `ExerciseRow` に `sort_order: number` を追加する

- [x] T006 [Type] `apps/mobile/src/types/exercise.ts` の `Exercise` に `sortOrder: number` を追加する

- [x] T007 [Repo] `ExerciseRepository` を更新する（`exercise.ts`）
  - `findAll()`: `ORDER BY sort_order ASC` に変更
  - `create()`: `MAX(sort_order) + 1` の取得と INSERT に `sort_order` を追加
  - `updateSortOrders(orders: { id: string; sortOrder: number }[])` メソッドを新規追加

- [x] T008 [Hook] `apps/mobile/src/features/exercise/hooks/useExerciseSearch.ts` の `toExercise()` に `sortOrder: row.sort_order` マッピングを追加する

**Checkpoint**: T001〜T008 のテストが全通過すること ✅

---

## Phase 2: 並び替えモーダル（TDD）

### TDD Red（テスト先行）

- [x] T009 [UI] `apps/mobile/src/features/exercise/components/__tests__/ExerciseReorderModal.test.tsx` を作成する（Red）
  - モーダルが `visible=true` のとき全種目が表示される
  - 各種目行にドラッグハンドル（testID: `drag-handle-{id}`）が表示される
  - 「キャンセル」タップでモーダルが閉じる（`onClose` が呼ばれる）
  - 「保存」タップで `onSave` に現在の順序が渡される
  - `visible=false` のときは描画されない

### Implementation

- [x] T010 [Package] `react-native-draggable-flatlist@~4.0.3` を `apps/mobile/package.json` に追加し `pnpm install` を実行する

- [x] T011 [UI] `apps/mobile/src/features/exercise/components/ExerciseReorderModal.tsx` を新規作成する
  - `Modal` コンポーネント（フルスクリーン、`animationType="slide"`）
  - `DraggableFlatList` で全種目を表示（`react-native-draggable-flatlist`）
  - 各行: ☰ ドラッグハンドル（左端）+ 種目名 + 部位バッジ + 器具バッジ
  - ドラッグ中の行: `bg-[#E6F2FF]` でハイライト
  - フッター: 「キャンセル」「保存する」ボタン
  - Props: `visible: boolean`, `exercises: Exercise[]`, `onSave: (ordered: Exercise[]) => void`, `onClose: () => void`

**Checkpoint**: T009 の全テストが通過すること ✅

---

## Phase 3: ExercisePickerScreen 統合（TDD）

### TDD Red（テスト先行）

- [x] T012 [Screen] `apps/mobile/src/features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx` に以下を追加する（Red）
  - ヘッダーに「⇅」ボタン（testID: `reorder-button`）が存在する
  - 「⇅」ボタンタップで並び替えモーダルが開く

### Implementation

- [x] T013 [Screen] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` を更新する
  - ヘッダー右端の `<View className="w-8" />` を `TouchableOpacity` に置き換え（⇅ ボタン）
  - `useState<boolean>` で `isReorderModalVisible` 状態を管理
  - `ExerciseReorderModal` を描画（`visible`, `exercises`, `onSave`, `onClose` を渡す）
  - `onSave` ハンドラ: `ExerciseRepository.updateSortOrders()` を呼び出し → `loadExercises()` で再読み込み

**Checkpoint**: 全テストが通過すること ✅

---

## Phase 4: 品質確認

- [x] T014 [P] `npx tsc --noEmit` を実行し型エラーがゼロであることを確認する
- [x] T015 [P] `pnpm lint` を実行し ESLint エラーがゼロであることを確認する（`simple-import-sort` は `eslint --fix` で修正）
- [x] T016 [P] `pnpm --filter mobile test --coverage` を実行し、新規テストが全通過することを確認する
  - SetRow.test.ts の7件は本機能と無関係の既存失敗（placeholder値の不一致）
- [ ] T017 iOS シミュレーターで手動確認する
  - 並び替えモーダルが開く
  - ドラッグ&ドロップで順序変更できる
  - 「保存」後に種目選択画面の順序が変わる
  - アプリ再起動後も順序が維持される
  - 「キャンセル」で変更が破棄される
