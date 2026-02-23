# ダッシュボード指標変更仕様書

## 概要

Issue #130: ホームのダッシュボードに表示する指標を変更する。

## 変更前後

### 変更前（2x2グリッド）

| 今月 ワークアウト | 今週 ワークアウト |
|---|---|
| 月間セット数 | 月間ボリューム |

### 変更後（案A: 今月/今週カード）

```
┌──────────────────────────────────┐
│ 今月                              │
│  ワークアウト  │  種目数  │  セット数  │
│      3        │    12    │    24    │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ 今週                              │
│  ワークアウト  │  種目数  │  セット数  │
│      1        │     4    │     8    │
└──────────────────────────────────┘
```

## 指標定義

| 指標 | 定義 |
|---|---|
| ワークアウト | 完了済みワークアウト件数 |
| 種目数 | workout_exercises の行数（同じ種目を複数回やっても重複カウント） |
| セット数 | sets の行数 |

## 実装変更

### `QuickStatsWidget.tsx`

- props: `monthlyWorkouts`, `monthlyExerciseCount`, `monthlySetCount`, `weeklyWorkouts`, `weeklyExerciseCount`, `weeklySetCount`
- 削除: `monthlyVolume`, `weeklyWorkouts`（古い単独prop）
- 削除: SVGアイコン（アイコン不要のシンプルレイアウトへ変更）

### `HomeScreen.tsx`

- バグ修正: 種目数・セット数の集計を最近3件サマリーから SQL集計（`fetchPeriodStats`）へ変更
- `dashboardStats` state 追加（SQL集計結果を格納）
- `useMemo` の出力を `monthlyWorkouts`, `weeklyWorkouts`, `lastWeekWorkouts` のみに整理

## テスト

- `QuickStatsWidget.test.tsx`: 12件（新規作成）
