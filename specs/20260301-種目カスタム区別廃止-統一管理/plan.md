# Implementation Plan: 種目のプリセット/カスタム区別廃止・全種目統一管理

**Feature Branch**: `20260301-種目カスタム区別廃止-統一管理`
**Created**: 2026-03-01
**Spec**: [spec.md](./spec.md)

## アーキテクチャ概要

本変更は「概念の削除（`is_custom` というフラグ）」と「新機能追加（復元フロー）」の2軸で構成される。変更は以下のレイヤーを横断する：

```
DB Layer         → Migration v12: テーブル再作成で is_custom カラム削除
Schema/Type Layer → schema.ts, types.ts の型定義更新
Repository Layer  → ExerciseRepository: findCustom削除, create修正, findByExactName修正
Hook Layer        → useExerciseHistory, useExerciseSearch: isCustom State削除・変換削除
UI Layer          → ExerciseHistoryFullScreen: isCustom条件分岐削除
                 → RecordScreen: インライン変換削除
                 → ExercisePickerScreen: 復元フロー追加
Seed Layer        → seed.ts: is_custom カラム削除
Test Layer        → 全テストファイルのモックデータ修正
```

## 依存関係グラフ

```
[A] DB Migration + Schema + Types    ← 基盤。他すべてがここに依存
       ↓
[B] Repository Layer               ← Aに依存。他のコード変更の前提
       ↓
[C1] useExerciseHistory            ← B, Aに依存（並列可）
[C2] useExerciseSearch             ← B, Aに依存（並列可）
[C3] RecordScreen インライン修正   ← B, Aに依存（並列可）
[C4] seed.ts 修正                  ← Aに依存（並列可）
       ↓
[D] ExerciseHistoryFullScreen      ← C1に依存
       ↓
[E] ExercisePickerScreen 復元フロー← B, C2に依存
       ↓
[F] Test 修正                      ← すべてに依存
       ↓
[G] Migration Test 修正            ← Aに依存
```

## 変更ファイル一覧

### DB・スキーマ・型定義

| ファイル | 変更内容 |
|---|---|
| `database/migrations.ts` | Migration v12 追加（LATEST_VERSION=12）。exercises テーブルを再作成して is_custom 削除 |
| `database/schema.ts` | `is_custom` カラム定義、`idx_exercises_is_custom` インデックス定義を削除 |
| `database/types.ts` | `ExerciseRow.is_custom: 0 \| 1` 削除、`Exercise.isCustom: boolean` 削除 |

### Repository

| ファイル | 変更内容 |
|---|---|
| `database/repositories/exercise.ts` | `findCustom()` 削除、`create()` から `is_custom=1` 削除、`findByExactName()` を削除済み含む全件検索に変更 |

### Hooks・Screens

| ファイル | 変更内容 |
|---|---|
| `features/exercise/hooks/useExerciseHistory.ts` | `isCustom` state・取得ロジック削除 |
| `features/exercise/hooks/useExerciseSearch.ts` | `toExercise()` から `isCustom` 変換削除 |
| `features/exercise/screens/ExerciseHistoryFullScreen.tsx` | `isCustom` 条件分岐削除（全種目に編集・削除ボタン表示） |
| `features/exercise/screens/ExercisePickerScreen.tsx` | `handleCreateCustom()` に削除済み種目復元フロー追加 |
| `features/workout/screens/RecordScreen.tsx` | インライン SQL クエリから `is_custom` 削除、`isCustom` 変換削除 |

### Seed

| ファイル | 変更内容 |
|---|---|
| `database/seed.ts` | INSERT 文から `is_custom` カラム削除 |

### テスト

| ファイル | 変更内容 |
|---|---|
| `database/repositories/__tests__/exercise.test.ts` | モックデータから `is_custom` 削除、`findCustom()` テスト削除、`findByExactName()` テスト更新 |
| `database/__tests__/migrations.test.ts` | LATEST_VERSION=12 対応（最新バージョンチェック・連鎖チェック更新） |
| `database/__tests__/seed.test.ts` | `is_custom` フィールド削除 |
| `features/exercise/hooks/__tests__/useExerciseHistory.test.ts` | `isCustom` 関連テスト削除・モックデータ更新 |
| `features/exercise/hooks/__tests__/useExerciseSearch.test.ts` | `isCustom` 変換テスト削除・モックデータ更新 |
| `features/exercise/screens/__tests__/ExerciseHistoryFullScreen.test.tsx` | 全種目に編集・削除ボタンが表示されることのテスト追加、`isCustom` 条件テスト削除 |
| `features/exercise/screens/__tests__/ExercisePickerScreen.test.tsx` | 復元フローテスト追加（削除済み同名種目 → 復元ダイアログ表示 → 復元実行） |
| `features/workout/screens/__tests__/RecordScreen.test.tsx` | モックデータから `is_custom` 削除 |
| `features/home/screens/__tests__/HomeScreen.test.tsx` | モックデータから `is_custom` 削除 |

## Migration 戦略

SQLite（Expo SDK 52）は `ALTER TABLE DROP COLUMN` を非サポートのため、テーブル再作成マイグレーションを使用：

```sql
-- Step 1: 既存テーブルをリネーム
ALTER TABLE exercises RENAME TO exercises_old;

-- Step 2: is_custom なしで新テーブル作成
CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  -- is_custom は削除
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Step 3: データコピー（is_custom 列を除外）
INSERT INTO exercises SELECT id, name, muscle_group, equipment, is_favorite, is_deleted, created_at, updated_at, sort_order FROM exercises_old;

-- Step 4: 旧テーブル削除
DROP TABLE exercises_old;

-- Step 5: インデックス再作成（idx_exercises_is_custom は除外）
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_is_favorite ON exercises(is_favorite);
CREATE INDEX IF NOT EXISTS idx_exercises_is_deleted ON exercises(is_deleted);
```

## 復元フロー設計（ExercisePickerScreen）

現在の `handleCreateCustom()` フローに以下を追加：

```
「作成して追加」タップ
  ↓
① 空白チェック（既存）
  ↓
② findByExactName(name) → 削除済みを含む全件検索（新: is_deleted 条件削除）
  ├─ null → 重複なし → ③ create()（既存フローへ）
  ├─ exists.is_deleted === 0 → 既存の重複 → AlertDialog 表示（既存）
  └─ exists.is_deleted === 1 → 削除済み同名種目 → 復元ダイアログ表示（新規追加）
         ↓「復元する」タップ
         ExerciseRepository.restore(exists.id)
         mode に応じて session.addExercise() or setSelectedIds
         setIsCreating(false) / form リセット
```

## TDD 実装手順

各変更について以下の順序で実装：
1. **テストを先に書く**（Red）
2. **実装して通す**（Green）
3. **必要であればリファクタ**（Refactor）

## リスクと注意点

1. **Migration の冪等性**: v12 は既に適用済みの DB に対して再実行されないことを確認（version チェック機構が既存実装済み）
2. **`findByExactName()` の戻り値変更**: 削除済み種目を返す可能性が生まれるため、呼び出し元（`handleCreateCustom`）の分岐ロジックが必要
3. **`isCustom` の完全除去**: TypeScript の型から削除されるため、コンパイルエラーで見落としを検出できる（安全）
4. **seed.ts の `refreshPresetExercises()`**: `is_custom = 0` のハードコードがあるため、コメントも含めて削除が必要

## 実装後の品質チェック

```bash
pnpm --filter mobile test          # テスト全件通過
pnpm --filter mobile tsc --noEmit  # 型チェック（isCustom の参照が残っていないか）
pnpm lint                          # Lint
```
