# タスク: 種目選択画面 FAB

## Task 1: テスト追加（Red フェーズ）
- FAB が表示されることを検証するテスト
- FAB タップで作成フォームが表示されることを検証するテスト
- フォーム表示中は FAB が非表示になることを検証するテスト
- 既存の `+ カスタム種目を追加` テキストボタンが表示されないことを検証するテスト

## Task 2: FAB 実装 + 既存ボタン削除（Green フェーズ）
- `ListFooterComponent` の非フォーム時ボタンを削除
- FAB コンポーネントを追加（absolute 配置、Ionicons `add`）
- `isCreating` が true のときは FAB を非表示
- multi モード時の bottom 位置調整
- `contentContainerStyle` の paddingBottom を FAB の領域分確保

## Task 3: 品質チェック
- テスト実行
- 型チェック
- lint チェック
