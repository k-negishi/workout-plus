# Tasks: 種目のプリセット/カスタム区別廃止・全種目統一管理

**Feature Branch**: `20260301-種目カスタム区別廃止-統一管理`
**Created**: 2026-03-01
**Total Tasks**: 12

## 実行可能タスク一覧

### Phase A: DB・スキーマ・型定義（並列可能）

---

#### Task A1: Migration v12 追加（テーブル再作成）
**優先度**: P1 | **並列**: 単独実行
**依存**: なし

- [ ] `database/migrations.ts` の `LATEST_VERSION` を 11 → 12 に変更
- [ ] `runMigrations()` 内に v11→v12 マイグレーションを追加
  - `exercises` テーブルのリネーム（`exercises_old`）
  - `is_custom` カラムなしで新テーブル作成
  - `exercises_old` からデータコピー（SELECT の列を `is_custom` 除外）
  - `exercises_old` の DROP
  - インデックス再作成（`idx_exercises_is_custom` は除外）
- [ ] `database/__tests__/migrations.test.ts` の更新
  - 「LATEST_VERSION（最新）でスキップ」テストを v11→v12 に更新
  - 連鎖テスト（v10→v11 から）の呼び出し回数を +1

**テスト対象**: migration を v11 の状態から実行すると `is_custom` カラムが消える

---

#### Task A2: schema.ts の is_custom 定義削除
**優先度**: P1 | **並列**: A1と並列可
**依存**: なし

- [ ] `database/schema.ts` の CREATE TABLE 定義から `is_custom INTEGER NOT NULL DEFAULT 0` を削除
- [ ] `idx_exercises_is_custom` インデックス定義を削除
- [ ] `is_custom` に関するコメントを削除

**注意**: schema.ts は Migration v12 の「新テーブル作成 SQL」と整合させること

---

#### Task A3: types.ts の型定義削除
**優先度**: P1 | **並列**: A1, A2と並列可
**依存**: なし

- [ ] `database/types.ts` の `ExerciseRow` から `is_custom: 0 | 1` を削除
- [ ] `Exercise` 型から `isCustom: boolean` を削除

**注意**: TypeScript コンパイルエラーが残存箇所の検出に役立つ（意図的にエラーを出し、後続Taskで修正）

---

### Phase B: Repository 層（A完了後）

---

#### Task B1: ExerciseRepository 変更
**優先度**: P1 | **並列**: 単独実行
**依存**: A3（型変更が必要）

**TDD手順**:
1. テストを先に修正（Red）
2. 実装を変更（Green）

- [ ] `database/repositories/__tests__/exercise.test.ts` を先に更新（TDD Red フェーズ）
  - モックデータの `is_custom` フィールドを全削除
  - `findCustom()` に関するテストを削除
  - `findByExactName()` のテスト：削除済み種目も返す挙動をテスト追加
- [ ] `database/repositories/exercise.ts` を変更（TDD Green フェーズ）
  - `findCustom()` メソッドを削除
  - `create()` の INSERT 文から `is_custom` カラムと値を削除
  - `findByExactName()` の SQL を `WHERE name = ?`（`is_deleted` 条件なし）に変更
  - JSDoc コメントを更新（「削除済みを含む」旨を明記）

---

### Phase C: Hook・Screen・Seed 層（B完了後、C同士は並列可）

---

#### Task C1: useExerciseHistory.ts 修正
**優先度**: P1 | **並列**: C2, C3, C4と並列可
**依存**: A3（型変更）

**TDD手順**:
1. テスト修正（Red）
2. 実装修正（Green）

- [ ] `features/exercise/hooks/__tests__/useExerciseHistory.test.ts` 更新
  - モックデータから `is_custom` を全削除
  - `isCustom` に関するテストケースを削除
- [ ] `features/exercise/hooks/useExerciseHistory.ts` 修正
  - `isCustom` State（`useState<boolean>`）を削除
  - `exerciseRow?.is_custom === 1` の判定ロジックを削除
  - フックの戻り値型から `isCustom` を削除

---

#### Task C2: useExerciseSearch.ts 修正
**優先度**: P1 | **並列**: C1, C3, C4と並列可
**依存**: A3（型変更）

**TDD手順**:
1. テスト修正（Red）
2. 実装修正（Green）

- [ ] `features/exercise/hooks/__tests__/useExerciseSearch.test.ts` 更新
  - モックデータから `is_custom` を全削除
  - `isCustom: true/false` の変換に関するテストケースを削除または修正
- [ ] `features/exercise/hooks/useExerciseSearch.ts` 修正
  - `toExercise()` 関数の `is_custom: 0 | 1` 型定義を削除
  - `isCustom: row.is_custom === 1` 変換を削除
  - `Exercise` 型のローカル定義（`is_custom` を含む `ExerciseRowWithUsage` など）から削除

---

#### Task C3: RecordScreen.tsx 修正
**優先度**: P1 | **並列**: C1, C2, C4と並列可
**依存**: A3（型変更）

**TDD手順**:
1. テスト修正（Red）
2. 実装修正（Green）

- [ ] `features/workout/screens/__tests__/RecordScreen.test.tsx` 更新
  - モックデータから `is_custom` を全削除
- [ ] `features/workout/screens/RecordScreen.tsx` 修正
  - インライン SQL クエリの `is_custom: 0 | 1` 型定義を削除
  - `isCustom: row.is_custom === 1` 変換を削除
  - `Exercise` 型のマッピングから `isCustom` を削除

---

#### Task C4: seed.ts 修正
**優先度**: P1 | **並列**: C1, C2, C3と並列可
**依存**: A1（マイグレーション後のスキーマに合わせる）

- [ ] `database/seed.ts` の `generateSeedSQL()` 関数の INSERT 文から `is_custom` カラムと値を削除
- [ ] `refreshPresetExercises()` 関数の INSERT から `is_custom = 0` を削除
- [ ] `database/__tests__/seed.test.ts` 更新（`is_custom` フィールド削除）

---

### Phase D: ExerciseHistoryFullScreen（C1完了後）

---

#### Task D1: ExerciseHistoryFullScreen.tsx 修正
**優先度**: P1 | **並列**: 単独実行
**依存**: C1（`useExerciseHistory` の戻り値から `isCustom` が消える）

**TDD手順**:
1. テスト修正・追加（Red）
2. 実装修正（Green）

- [ ] `features/exercise/screens/__tests__/ExerciseHistoryFullScreen.test.tsx` を先に更新
  - モックデータから `isCustom: false/true` を削除
  - **新規テスト追加**: プリセット種目（旧 `isCustom: false`）でも編集・削除ボタンが表示される
  - **削除テスト**: `isCustom === false` のとき編集・削除ボタンが非表示、というテスト
- [ ] `features/exercise/screens/ExerciseHistoryFullScreen.tsx` 修正
  - `isCustom` を `useExerciseHistory()` から取得している部分を削除
  - `{isCustom ? (<View>...) : null}` を `<View>...</View>`（常に表示）に変更
  - `isCustom` に関するインポートや型を削除

---

### Phase E: ExercisePickerScreen 復元フロー（B + C2完了後）

---

#### Task E1: ExercisePickerScreen 復元フロー追加
**優先度**: P2 | **並列**: 単独実行
**依存**: B1（`findByExactName` が削除済みを返す）, C2（`useExerciseSearch` の型変更）

**TDD手順**:
1. 復元フロー用テストを先に追加（Red）
2. 実装を変更（Green）

- [ ] `features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx` に以下テストを追加
  - **削除済み同名種目あり → 復元ダイアログ表示**: `findByExactName` が `{..., is_deleted: 1}` を返す場合、「復元しますか？」ダイアログが表示される
  - **「復元する」選択 → `restore()` が呼ばれる**: ダイアログで復元を選択すると `ExerciseRepository.restore(id)` が呼ばれる
  - **「キャンセル」選択 → ダイアログ閉じてフォームに戻る**: キャンセル後、フォームは維持される
  - **既存の「通常重複」テストが引き続き通る**: `is_deleted === 0` の場合は従来の重複ダイアログが表示される
- [ ] `features/exercise/screens/ExercisePickerScreen.tsx` の `handleCreateCustom()` 修正
  - `findByExactName()` の結果を `existing` として受け取り:
    - `existing === null` → 重複なし → `create()`（既存フロー）
    - `existing.is_deleted === 0` → 既存の重複 → 重複ダイアログ（既存フロー）
    - `existing.is_deleted === 1` → 削除済み種目 → 復元ダイアログ（新規）
  - 復元ダイアログの state 追加（`isRestoreDialogVisible`, `restoreTarget`）
  - `handleRestoreExercise()` 関数追加（`restore(id)` → mode 分岐 → フォームリセット）
  - 復元ダイアログ UI 追加（AlertDialog または Alert.alert）

---

### Phase F: その他テスト修正（各Phase完了後）

---

#### Task F1: その他テストファイルのモックデータ修正
**優先度**: P1 | **並列**: 単独実行
**依存**: A3（型変更）

- [ ] `features/home/screens/__tests__/HomeScreen.test.tsx` のモックデータから `is_custom` を削除
- [ ] 他に `is_custom` を含むテストファイルがあれば同様に削除

---

## タスク依存関係サマリー

```
A1 ─┐
A2 ─┤→ B1 ─┬→ C1 ─→ D1
A3 ─┘       ├→ C2 ─→ E1
            ├→ C3
            └→ C4

F1 ← A3（型変更に追従）
```

## 並列実行グループ

| グループ | タスク | 前提 |
|---|---|---|
| Group 1 | A1, A2, A3 | なし（並列実行可） |
| Group 2 | B1 | A1, A2, A3 完了後 |
| Group 3 | C1, C2, C3, C4 | B1 完了後（Group 3 内は並列可） |
| Group 4 | D1 | C1 完了後 |
| Group 5 | E1 | B1, C2 完了後 |
| Group 6 | F1 | A3 完了後（随時） |

## 品質チェックコマンド

```bash
pnpm --filter mobile test          # テスト全件（目標: 全件 Green）
pnpm --filter mobile tsc --noEmit  # 型チェック（isCustom 残存確認）
pnpm lint                          # Lint
```
