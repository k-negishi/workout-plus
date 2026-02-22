# 実装計画: 指標セット数統一

## アーキテクチャ概要

変更はすべて UI レイヤー + 1つの hooks 変更のみ。DB スキーマ変更なし。

```
useExerciseHistory (stats 型拡張)
  └─ ExerciseHistoryFullScreen (表示変更: #113, #114)

WeeklyGoalsWidget (prop 変更: #110)
  └─ HomeScreen (データ計算変更)

QuickStatsWidget (prop + 表示変更: #111)
  └─ HomeScreen (データ計算変更)

WorkoutDetailScreen (概要カード変更: #112)

DaySummary (カード順序変更: #115)
```

## 依存関係

- #110, #111 は HomeScreen を経由するため同一エージェントで実装
- #113, #114 は useExerciseHistory を共有するため同一エージェントで実装
- #112, #115 は独立して変更可能

## TDD 方針

1. テストを先に書いて Red にする
2. 最小実装で Green にする
3. リファクタしない（変更量が小さいため）

## エージェント分割

| エージェント | 担当 Issues | 変更ファイル |
|---|---|---|
| A1 | #110, #111 | WeeklyGoalsWidget, QuickStatsWidget, HomeScreen, 各テスト |
| A2 | #112 | WorkoutDetailScreen, WorkoutDetailScreen test |
| A3 | #113, #114 | useExerciseHistory, ExerciseHistoryFullScreen, 各テスト |
| A4 | #115 | DaySummary, DaySummary test |
