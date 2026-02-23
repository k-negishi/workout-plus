# タスク一覧: 前回セット表示インラインチップ形式（Issue #138）

## ユーザーストーリー 1: テストを更新する（TDD RED フェーズ）

- [x] T1: `ExerciseBlock.test.tsx` の `createDefaultProps` から `onCopyAllPrevious` を削除し、新テストを追加する
  - 削除: `前回記録コピーボタン` describe（3テスト）
  - 削除: `バッジテキスト` describe（1テスト）
  - 削除: `showPreviousRecord prop` describe（3テスト）
  - 削除: `種目削除ボタンの配置` 内の `バッジが削除ボタンより先にレンダリングされる` テスト
  - 追加: 部位ラベルが表示されないこと
  - 追加: 前回記録がある場合、`前回 2/20` テキストが表示される
  - 追加: 前回記録がある場合、`① 60×10` `② 65×8` 形式のチップが表示される
  - 追加: 前回記録が null の場合、チップ行が非表示（`前回` テキストが存在しない）
  - 並列: 不可（T2 の前提）

## ユーザーストーリー 2: ExerciseBlock を実装する（TDD GREEN フェーズ）

- [x] T2: `ExerciseBlock.tsx` を実装する
  - 削除: `onCopyAllPrevious`、`showPreviousRecord` prop
  - 削除: `MUSCLE_GROUP_LABELS`、`muscleLabel`、`previousBadgeText` useMemo
  - 削除: 部位ラベル `<Text>`、バッジ `TouchableOpacity`
  - 追加: `CIRCLED_NUMBERS`、`getCircledNumber()` ヘルパー
  - 追加: 前回チップ行（flexWrap: 'wrap'、fontSize 12、color '#94a3b8'）
  - 並列: T1 完了後

## ユーザーストーリー 3: RecordScreen のコピー関連コードを削除する

- [x] T3: `RecordScreen.tsx` からコピー関連コードを削除する
  - 削除: `PreviousSetData` 型
  - 削除: `ExerciseBlockWithPrevious` の `onCopyPreviousSet` prop と `handleCopyAllPrevious`
  - 削除: `handleCopyPreviousSet` callback
  - 削除: `onCopyPreviousSet={handleCopyPreviousSet}` の呼び出し
  - 並列: T2 と並列可能

## ユーザーストーリー 4: 品質検証

- [x] T4: テスト実行・型チェック・Lint 通過確認
  - `pnpm --filter mobile test apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx`
  - `pnpm --filter mobile tsc --noEmit`
  - `pnpm lint`
  - 並列: 不可（T2・T3 完了後）

## 依存関係

```
T1 → T2 → T4
          T3 → T4
```
