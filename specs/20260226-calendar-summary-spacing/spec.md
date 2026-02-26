# カレンダーとサマリー間の空白縮小

## Issue

- GitHub Issue: #170
- タイトル: カレンダーとサマリーの間の空白が広すぎる

## 背景

カレンダー画面（CalendarScreen）において、MonthCalendar コンポーネントと DaySummary コンポーネントの間の余白が大きすぎ、ユーザーがスクロールしないとサマリーが見えにくくなっている。

## 現状分析

空白の内訳:
1. **DaySummary の `marginTop: 20`**: loading / no-workout / workout の全 3 状態で適用
2. **react-native-calendars の内部パディング**: Calendar コンポーネント下部の内部余白

合計で約 30-40px の空白が発生している。

## 要件

- MonthCalendar と DaySummary の間の空白を適切なサイズに縮小する
- デザインガイドラインの 4px 倍数ルールに従う
- 3 つの DaySummary 状態（loading / no-workout / workout あり）すべてで統一的に適用する

## 変更対象

| ファイル | 変更内容 |
|---------|---------|
| `DaySummary.tsx` | `marginTop: 20` → `marginTop: 8` に縮小（全3状態） |

## 受入条件

- [ ] カレンダーとサマリーの間の空白が視覚的に適切なサイズになっている
- [ ] loading / no-workout / workout ありの 3 状態で余白が統一されている
- [ ] 既存テストが全て通過する
- [ ] 型チェック・Lint が通過する
