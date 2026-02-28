# 仕様書: AIチャットのタイピングインジケーター改善

## GitHub Issue
https://github.com/k-negishi/workout-plus/issues/198

## 概要

AIチャット画面の「考え中...」静的テキストを、ChatGPT風の3ドットバウンスアニメーションに変更する。

## 現状

- `AIScreen.tsx` 内の `TypingIndicator` コンポーネントが `isLoading=true` 時に表示される
- 現在は「考え中...」という静的テキストのみ
- アニメーションなし

## 要件

### 機能要件

- [ ] 3つのドットが順番にバウンス（上下移動）するアニメーションを実装する
- [ ] ドットは約160msずつずれて順番にアニメーションする（stagger）
- [ ] アニメーションはループし、AI応答が返るまで継続する
- [ ] コンポーネントのアンマウント時にアニメーションを停止する
- [ ] `testID="typing-indicator"` を付与してテスト・E2E から検出可能にする
- [ ] `testID="typing-dot-0"`, `"typing-dot-1"`, `"typing-dot-2"` を各ドットに付与する

### 非機能要件

- バブルのスタイル（背景色 `colors.neutralBg`、角丸、余白）は既存を維持する
- ドットのサイズ: 直径 8px
- ドットの色: `colors.textSecondary`
- ドット間隔: 4px
- バウンス移動量: -6px（上方向）
- アニメーション周期: 1ドット800ms、オフセット160ms

## ユーザーストーリー

**ユーザーとして**: AIが回答を生成中であることを視覚的にわかりやすく確認したい
**そのために**: ChatGPT風の3ドットアニメーションを表示する
**結果**: 処理中であることが直感的に伝わる

## 対象ファイル

- 変更: `apps/mobile/src/app/screens/AIScreen.tsx`（`TypingIndicator` 関数を更新）
- 変更: `apps/mobile/src/app/screens/__tests__/AIScreen.test.tsx`（TypingIndicator テスト追加）
