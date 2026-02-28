# タスク: AIチャット タイピングインジケーター改善

## タスク一覧

- [ ] T1: TypingIndicator の失敗テストを追加（Red）
- [ ] T2: TypingIndicator をアニメーション実装に置き換え（Green）
- [ ] T3: テスト・型チェック・Lint 通過確認（Refactor/Quality）

## T1: 失敗テストを追加（Red）

**対象**: `apps/mobile/src/app/screens/__tests__/AIScreen.test.tsx`

追加するテストケース:
1. `isLoading 中に typing-indicator が表示されること`
2. `AI応答後に typing-indicator が非表示になること`
3. `ローディング中に typing-dot-0, 1, 2 が表示されること`

## T2: TypingIndicator 実装（Green）

**対象**: `apps/mobile/src/app/screens/AIScreen.tsx`

- `TypingIndicator` 関数を `Animated` API を使った3ドットバウンスアニメーションに置き換え
- `useRef`, `useEffect`, `Animated` を import に追加
- `testID="typing-indicator"` をコンテナに付与
- 各ドットに `testID="typing-dot-{i}"` を付与

## T3: 品質確認

```bash
pnpm --filter mobile test -- --testPathPattern="AIScreen"
pnpm --filter mobile tsc --noEmit
pnpm lint
```
