# Quickstart: 種目選択ソート実装ガイド

## 変更ファイル一覧

### 新規作成

| ファイル | 役割 |
|---------|------|
| `apps/mobile/src/types/exerciseSort.ts` | `ExerciseSortOrder` 型定義 |
| `apps/mobile/src/features/exercise/components/ExerciseSortChips.tsx` | ソートチップUIコンポーネント |
| `apps/mobile/src/features/exercise/hooks/__tests__/useExerciseSearch.sortOrder.test.ts` | ソートロジックのユニットテスト |
| `apps/mobile/src/features/exercise/components/__tests__/ExerciseSortChips.test.tsx` | UIコンポーネントのテスト |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `apps/mobile/src/database/repositories/exercise.ts` | `findAllWithUsageCount()` を追加 |
| `apps/mobile/src/stores/exerciseStore.ts` | `sortOrder` と `setSortOrder` を追加 |
| `apps/mobile/src/features/exercise/hooks/useExerciseSearch.ts` | `sortOrder` 引数追加、`computeSections` に分岐追加 |
| `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` | `ExerciseSortChips` を組み込み、sortOrder 連動 |

## 実装順序（依存関係順）

```
1. types/exerciseSort.ts                    （型定義、依存なし）
2. stores/exerciseStore.ts                  （型定義に依存）
3. database/repositories/exercise.ts        （型定義に依存）
4. hooks/useExerciseSearch.ts              （型定義・ストアに依存）
5. components/ExerciseSortChips.tsx         （型定義に依存）
6. screens/ExercisePickerScreen.tsx         （全てに依存）
```

## テスト実行コマンド

```bash
# 種目選択ソート機能のテストのみ実行
pnpm --filter mobile test -- --testPathPattern="exerciseSort|ExerciseSearch|ExerciseSortChips"

# 全テスト（カバレッジ付き）
pnpm --filter mobile test --coverage

# 型チェック
pnpm --filter mobile tsc --noEmit

# Lint
pnpm lint
```

## デザイン仕様（ExerciseSortChips）

```
検索バー
─────────────────────────────────
[名前順] [部位別] [追加日順] [よく使う順]   ← 水平スクロール可能
─────────────────────────────────
種目リスト
```

- チップの高さ: 28px
- フォントサイズ: 13px（weight: 400/600）
- アクティブ状態: 背景 #E6F2FF、テキスト #4D94FF、ボーダー #4D94FF
- 非アクティブ状態: 背景 #f9fafb、テキスト #64748b、ボーダー #e2e8f0
- チップ間の余白: 8px
- 横パディング: 12px、縦パディング: 4px
- border-radius: 6px（Constitution II 準拠）

## 注意事項

- `findAllWithUsageCount()` は `'frequency'` ソート選択時のみ呼び出す（他のソートでは不要）
- `computeSections()` は純粋関数のまま維持する（テスト容易性のため）
- ExercisePickerScreen の `useFocusEffect` で `sortOrder` が `'frequency'` の場合のみ `findAllWithUsageCount()` を呼ぶ
