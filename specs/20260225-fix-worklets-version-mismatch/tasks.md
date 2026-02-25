# タスク: react-native-worklets バージョンミスマッチ修正

## タスク一覧

- [X] T1: `apps/mobile/package.json` に `react-native-worklets: "0.5.1"` を追加
- [X] T2: `pnpm install` を実行してロックファイルを更新
- [X] T3: `pnpm-lock.yaml` で worklets が 0.5.1 に解決されていることを確認
- [X] T4: `pnpm lint` を実行して Lint が通ることを確認
- [X] T5: `pnpm --filter mobile tsc --noEmit` を実行して型チェックが通ることを確認
- [X] T6: CLAUDE.md memory を更新（ネイティブ依存ピン留めパターンの記録）

## 並列実行可否

T1 → T2 → T3（順次）
T4, T5（T3 完了後 並列実行可）
T6（いつでも可）

## 総タスク数: 6 / 完了: 6
## ユーザーストーリー: 1（Expo Go でアプリが起動できる）
## 並列可能タスク数: 2（T4/T5）
