# 実装計画: react-native-worklets バージョンミスマッチ修正

## アーキテクチャ概要

依存関係のみの変更。アプリコードは一切変更しない。

```
apps/mobile/package.json
  └── react-native-worklets: "0.5.1" (追加)
       ↓ pnpm install
pnpm-lock.yaml
  └── react-native-worklets@0.5.1 に解決（0.7.4 から変更）
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `apps/mobile/package.json` | `dependencies` に `"react-native-worklets": "0.5.1"` を追加 |
| `pnpm-lock.yaml` | `pnpm install` で自動更新 |

## 依存関係チェーン

```
react-native-reanimated@4.1.6
  peerDep: react-native-worklets >= 0.5.0   (0.5.1 を満たす ✅)

@gorhom/bottom-sheet@5.2.8
  peerDep: react-native-reanimated >= 3.6.0  (4.1.6 を満たす ✅)

nativewind@4.2.2
  peerDep: react-native-reanimated >= 3.0.0  (4.1.6 を満たす ✅)

react-native-draggable-flatlist@4.0.3
  peerDep: react-native-reanimated >= 3.0.0  (4.1.6 を満たす ✅)
```

## リスク評価

| リスク | 可能性 | 対処 |
|-------|-------|------|
| reanimated 4.1.6 が worklets 0.5.1 の API を使用できない | 低（bundledNativeModules で明示的に組み合わせが指定されている） | 発生した場合は reanimated を ~4.0.0 まで下げる |
| 他の依存パッケージが worklets 0.7.4 を要求する | 現時点ではなし（pnpm-lock 確認済み） | 発生時は pnpm.overrides で対処 |
