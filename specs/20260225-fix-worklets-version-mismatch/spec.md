# 仕様書: react-native-worklets バージョンミスマッチ修正

## 概要

GitHub Issue #145 で報告された Expo Go 上でのクラッシュを修正する。

## 問題

```
[Worklets] Mismatch between JavaScript part and native part of Worklets (0.7.4 vs 0.5.1)
```

- **JS 側**: `react-native-worklets@0.7.4`（pnpm が peer dep `>=0.5.0` を最新版で解決）
- **Native 側**: `react-native-worklets@0.5.1`（Expo SDK 54 が Expo Go にバンドル済み）

## 根本原因

`react-native-worklets` が `apps/mobile/package.json` の直接依存に存在しない。
pnpm は `react-native-reanimated@4.1.6` の peer dependency `react-native-worklets: >=0.5.0` を
「範囲内の最新版（0.7.4）」で解決する。その結果 JS 側が 0.7.4 になるが、
Expo Go の native 側は 0.5.1 固定のためバージョン不整合が発生する。

## 証拠

`expo/bundledNativeModules.json`（Expo SDK 54 同梱）の定義:
```json
{
  "react-native-reanimated": "~4.1.1",
  "react-native-worklets": "0.5.1"
}
```

Expo が意図する組み合わせは `react-native-reanimated ~4.1.1` + `react-native-worklets 0.5.1`。

## 修正方針

`apps/mobile/package.json` に `react-native-worklets: "0.5.1"` を直接依存として追加し、
pnpm の semver 自動解決を無効化する。

CLAUDE.md のルール遵守:
> ネイティブモジュールのバージョンは `^`（caret）禁止 → `~`（tilde）か厳密固定で
> SDK bundledNativeModules と一致させる

## 受け入れ基準

- [ ] `apps/mobile/package.json` に `"react-native-worklets": "0.5.1"` が追加されている
- [ ] `pnpm-lock.yaml` が `react-native-worklets@0.5.1` で解決している
- [ ] `pnpm lint` が通る
- [ ] `pnpm tsc --noEmit` が通る
- [ ] Expo Go 起動時に Worklets バージョンミスマッチエラーが発生しない

## 影響範囲

- `apps/mobile/package.json`: 依存追加のみ
- `pnpm-lock.yaml`: ロックファイル更新
- アプリコードの変更なし
