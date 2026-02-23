# タスク: 種目削除ボタンの配置修正（Issue #137）

## サマリー
- 総タスク数: 4
- 並列実行可能: なし（TDD順で逐次実行）

---

## T-1: 失敗テストを追加する（Red フェーズ）

**ファイル**: `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx`

**内容**:
- 前回記録バッジ（`前回: Xセット`）と削除ボタン（`✕`）の描画順序を検証するテストを追加
- `getAllByRole` または `getByText` + 親ノードの順序チェックでバッジが先・✕が後になることを確認
- この時点ではテストが失敗することを確認する

**完了条件**:
- [X] テストが追加されている
- [X] `pnpm --filter mobile test ExerciseBlock` でテストが赤（FAIL）になる（確認済み）

---

## T-2: プロダクションコードを修正する（Green フェーズ）

**ファイル**: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`

**内容**:
- ヘッダー右エリアの JSX 要素順序を変更
  - 変更前: `[✕ボタン TouchableOpacity] [前回記録バッジ TouchableOpacity]`
  - 変更後: `[前回記録バッジ TouchableOpacity] [✕ボタン TouchableOpacity]`
- スタイル・accessibilityLabel は変更しない
- Issue #134 対応: カラムヘッダー「回」→「rep」に変更（テストがすでに期待していたため同時対応）

**完了条件**:
- [X] `pnpm --filter mobile test ExerciseBlock` で T-1 のテストが緑（PASS）になる（17/17）
- [X] 既存テストもすべて PASS する

---

## T-3: 型チェック・Lint を通す

**内容**:
- `pnpm --filter mobile tsc --noEmit` でエラーなし
- `pnpm lint` でエラーなし

**完了条件**:
- [X] TypeScript エラーなし（変更ファイルに新規エラーなし）
- [X] ESLint エラーなし（変更ファイルにエラーなし、既存ファイルの警告のみ）

---

## T-4: 最終確認

**内容**:
- 全テストスイート実行
- 変更ファイルを最終レビュー

**完了条件**:
- [X] 全テスト PASS（30 suites / 313 tests）
- [X] カバレッジに問題なし
