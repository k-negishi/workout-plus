# 実装計画: カレンダーとサマリー間の空白縮小

## 概要

DaySummary コンポーネントの `marginTop` を 20px → 8px に変更する単純なスタイル修正。

## 変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `apps/mobile/src/features/calendar/components/DaySummary.tsx` | 修正 | `marginTop: 20` → `marginTop: 8`（3箇所） |
| `apps/mobile/src/features/calendar/components/__tests__/DaySummary.test.tsx` | 修正（必要に応じて） | marginTop を検証するテストがあれば更新 |

## アーキテクチャへの影響

なし。スタイル値の変更のみ。

## リスク

- 低: スタイル変更のみのため機能への影響なし
- react-native-calendars の内部パディングは変更不可（ライブラリ内部）のため、DaySummary 側で調整する

## 実装手順

1. DaySummary.tsx の `marginTop: 20` を `marginTop: 8` に変更（3箇所: loading / no-workout / workout）
2. 既存テスト実行で回帰がないことを確認
3. 型チェック・Lint 実行
