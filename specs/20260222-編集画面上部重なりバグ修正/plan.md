# Implementation Plan: 編集画面上部重なりバグ修正

**Feature**: 編集画面上部重なりバグ修正
**Date**: 2026-02-22
**Type**: バグ修正（UI/SafeArea）

## 概要

`WorkoutEditScreen` のカスタムヘッダーが SafeArea を考慮していないため、
ステータスバー・ノッチ領域と重なるバグを修正する。

## 技術スタック

- TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
- `react-native-safe-area-context`（既導入済み）
- NativeWind v4
- Jest + @testing-library/react-native

## 影響ファイル

| ファイル | 変更内容 |
|---|---|
| `apps/mobile/src/features/workout/screens/WorkoutEditScreen.tsx` | `useSafeAreaInsets` を追加し、ヘッダーに `paddingTop: insets.top` を適用 |
| `apps/mobile/src/features/workout/screens/__tests__/WorkoutEditScreen.test.tsx` | 新規作成：SafeArea 適用テスト |

## 参照パターン

他の同一スタック画面の実装を参照する：

- `WorkoutDetailScreen.tsx`：`useSafeAreaInsets` + `paddingTop: insets.top` をヘッダーに適用済み
- `RecordScreen.tsx`：同様の実装パターン

## 実装方針

1. TDD：テストを先に書いて Red → Green
2. `useSafeAreaInsets` を import し、`const insets = useSafeAreaInsets()` を追加
3. ヘッダーの View に `style={{ paddingTop: insets.top }}` を追加（既存の className はそのまま）
4. 固定値 padding は使わない（`.claude/rules/safe-area.md` 準拠）
