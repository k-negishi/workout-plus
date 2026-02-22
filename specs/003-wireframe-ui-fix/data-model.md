# Data Model: ワイヤーフレーム完全準拠 UI 修正

**Phase**: 1 — Design
**Date**: 2026-02-22

---

## 概要

本フィーチャーはビジュアル層の修正と開発用シードデータの追加のみ。既存のデータモデル（`specs/001-workout-core-screens/data-model.md`）は**一切変更しない**。

---

## DB スキーマ変更

### 変更なし

既存テーブル（exercises / workouts / workout_exercises / sets / personal_records）の構造は変更しない。

---

## Migration v2: 開発用シードデータ

### 目的
`database/migrations.ts` に migration v2 を追加し、2026/2/1 のワークアウトデータを投入する。

### 投入データ構造

```
workouts テーブル
├── id: ulid()
├── status: 'completed'
├── created_at: 1738332000000  (2026-02-01 00:00:00 JST)
├── completed_at: 1738339200000  (2026-02-01 02:00:00 JST)
└── elapsed_seconds: 7200

workout_exercises テーブル（2件）
├── [0] id: ulid(), workout_id: <above>, exercise_id: <ベンチプレスID>, order_index: 0
└── [1] id: ulid(), workout_id: <above>, exercise_id: <インクラインベンチプレスID>, order_index: 1

sets テーブル（6件）
├── ベンチプレス sets (workout_exercise_id: [0])
│   ├── set 1: weight=60, reps=10, set_number=1
│   ├── set 2: weight=65, reps=8,  set_number=2
│   └── set 3: weight=70, reps=5,  set_number=3
└── インクラインベンチプレス sets (workout_exercise_id: [1])
    ├── set 1: weight=50, reps=10, set_number=1
    ├── set 2: weight=55, reps=8,  set_number=2
    └── set 3: weight=55, reps=6,  set_number=3
```

### 冪等性ガード
```sql
-- 実行前チェック: 完了済みワークアウトが 0 件の場合のみシードを実行
SELECT COUNT(*) as count FROM workouts WHERE status = 'completed';
-- count === 0 の場合のみシードを実行
```

---

## 新規コンポーネントの型定義

### WeeklyGoalsWidget Props

```typescript
// apps/mobile/src/features/home/components/WeeklyGoalsWidget.tsx
type WeeklyGoalsWidgetProps = {
  /** 今週のワークアウト数 */
  thisWeekWorkouts: number;
  /** 今週の総負荷量（kg）*/
  thisWeekVolume: number;
  /** 前週のワークアウト数（前週比計算用）*/
  lastWeekWorkouts: number;
  /** 週の目標ワークアウト数（デフォルト: 3）*/
  targetWorkouts?: number;
};
```

### RecentWorkoutCard Props（拡張）

```typescript
// apps/mobile/src/features/home/components/RecentWorkoutCard.tsx
type RecentWorkoutCardProps = {
  completedAt: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  durationSeconds: number;
  onPress: () => void;
  /** 追加: 代表部位（最も多い種目の部位）。アイコン色の決定に使用 */
  primaryMuscleGroup?: string;
};
```

### HomeScreen の WorkoutSummary 型（拡張）

```typescript
// HomeScreen.tsx 内の型
type WorkoutSummary = {
  id: string;
  completedAt: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  durationSeconds: number;
  /** 追加: 代表部位（最も多い種目の部位を集計）*/
  primaryMuscleGroup?: string;
};
```

---

## カラー定数（追加なし）

既存の `colors.ts` に必要な色はすべて定義済み：

| 用途 | 定数 | 値 |
|------|------|----|
| StreakCard 背景 | `colors.primaryBgSubtle` | `rgba(77,148,255,0.08)` |
| StreakCard ボーダー | `colors.primaryBorderSubtle` | `rgba(77,148,255,0.15)` |
| StreakCard done 背景 | `colors.primary` | `#4D94FF` |
| StreakCard rest 背景 | ハードコード | `rgba(77,148,255,0.10)` ← colors.ts に追加予定 |
| 訓練日背景 | `colors.primaryBg` | `#E6F2FF` |
| 今日背景 | `colors.primary` | `#4D94FF` |
| 種目ブロック区切り | `colors.neutralBg` | `#F1F3F5` |

**追加する定数**: `streakDayRest: 'rgba(77, 148, 255, 0.10)'`（StreakCard の休息日専用色。`primaryBgSubtle` とは異なる値）

---

## 既存 API との互換性

- `HomeScreen.tsx` の `fetchData` クエリは変更なし
- `WorkoutSummary` 型への `primaryMuscleGroup` 追加は後方互換（オプショナル型）
- `RecentWorkoutCard` の `primaryMuscleGroup` prop はオプショナルのため、既存テストへの影響なし
