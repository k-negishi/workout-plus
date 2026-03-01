# タスク一覧: 種目履歴画面の見出し・日付フォントサイズ拡大

## US-1: 種目履歴画面の見出し・日付を大きくする

### T1: テスト追加（Red フェーズ）
- **並列**: 不可（T2 のベースライン）
- **内容**: `ExerciseHistoryFullScreen.test.tsx` にフォントサイズ検証テストを追加する
  - ヘッダータイトルが fontSize 20 であること
  - セクション見出しが text-base クラス（または fontSize 16）を持つこと
  - 日付テキストが fontSize 15 であること
- [ ] T1: テスト追加

### T2: 実装（Green フェーズ）
- **並列**: 不可（T1 完了後）
- **内容**: `ExerciseHistoryFullScreen.tsx` のフォントサイズを変更する
  - ヘッダータイトル: `fontSize: 17` → `fontSize: 20`
  - セクション見出し3箇所: `text-sm` → `text-base`
  - 日付テキスト: `fontSize: 13` → `fontSize: 15`
- [ ] T2: 実装

### T3: 品質チェック
- **並列**: 不可（T2 完了後）
- **内容**: テスト・型チェック・Lint を実行する
- [ ] T3: `pnpm --filter mobile test` パス
- [ ] T3: `pnpm --filter mobile tsc --noEmit` パス
- [ ] T3: `pnpm lint` パス
