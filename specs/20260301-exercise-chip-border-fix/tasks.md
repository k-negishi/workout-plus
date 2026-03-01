# タスクリスト: 種目追加フォーム チップボタンのボーダー視認性修正

**総タスク数**: 3
**並列実行可能**: なし（TDD順に逐次実行）

---

## T1: テスト追加（Red フェーズ）

**依存**: なし
**並列**: 不可（T2 の前に実行）

チップボタンのスタイルを検証するテストを `ExercisePickerScreen.test.tsx` に追加する。

### テスト追加内容

`describe('ExercisePickerScreen - チップボタンのスタイル（Issue #205）', ...)` ブロックを追加:

- [X] 未選択の部位チップに `borderColor: '#CBD5E1'` が設定されている
- [X] 未選択の部位チップに `backgroundColor: '#F8FAFC'` が設定されている
- [X] 選択された部位チップに `borderColor: '#4D94FF'` が設定されている
- [X] 選択された部位チップに `backgroundColor: '#E6F2FF'` が設定されている
- [X] 器具チップも同様のスタイルを持つ

---

## T2: 実装（Green フェーズ）

**依存**: T1
**並列**: 不可（T1 後）

`ExercisePickerScreen.tsx` の `ExerciseListHeader` 内チップスタイルを修正する。

- [X] 部位チップ（MUSCLE_GROUP_OPTIONS）の未選択 `borderColor` を `'#e2e8f0'` → `'#CBD5E1'` に変更
- [X] 部位チップの未選択 `backgroundColor` を `'white'` → `'#F8FAFC'` に変更
- [X] 器具チップ（EQUIPMENT_OPTIONS）も同一変更を適用
- [X] `pnpm --filter mobile test` が通ること（30/30）

---

## T3: 品質チェック

**依存**: T2
**並列**: 不可（T2 後）

- [X] `pnpm --filter mobile tsc --noEmit` が通ること（エラーなし）
- [X] `pnpm lint` が通ること（エラー0件、警告は既存のもの）
- [X] テストカバレッジが低下していないこと（30テスト → 全通過）
