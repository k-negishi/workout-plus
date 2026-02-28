# 実装計画: AIチャット タイピングインジケーター改善

## アーキテクチャ方針

- `TypingIndicator` は `AIScreen.tsx` 内のローカル関数コンポーネントとして実装（1ファイルで完結する小さな変更）
- `Animated` API（react-native 標準）を使用。外部ライブラリ不要
- コンポーネントのアンマウント時に `animation.stop()` で確実にクリーンアップ

## 実装詳細

### アニメーション設計

各ドット `i`（0, 1, 2）に対して:
- `new Animated.Value(0)` を初期値として生成
- `Animated.loop(Animated.sequence([...]))` でループ
- sequence の内容:
  1. `delay(160 * i)` でオフセット
  2. `timing(val, { toValue: -6, duration: 300 })` で上昇
  3. `timing(val, { toValue: 0, duration: 300 })` で下降
  4. `delay(800 - 600 - 160 * i)` で残余待機（全体周期 800ms）

### translateY での表現

`Animated.Value` を `translateY` にバインドすることで上下移動を実現。
opacity ではなく位置アニメーションの方がよりChatGPTらしい。

### テスト方針

- `jest.useFakeTimers()` を使用してアニメーション完了をシミュレートしない
- `testID` で要素の存在確認のみ行う（アニメーション値のテストは不要）
- `isLoading=true` の間 `typing-indicator` が表示されること
- AI応答後に `typing-indicator` が非表示になることを検証

## 依存関係

- `Animated`: react-native 標準（追加インストール不要）
- `useRef`, `useEffect`: React 標準フック
