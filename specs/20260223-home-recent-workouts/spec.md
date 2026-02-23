# ホーム画面 最近のトレーニング表示改善

## Issue
#132

## 変更概要

RecentWorkoutCard と HomeScreen の表示改善。

### 1. 日付フォーマット変更
- **Before**: `M/d EEEE`（例: `2/18 水曜日`）
- **After**: `M月d日(E)`（例: `2月18日(水)`）

### 2. 部位名表示
- 日付の隣にワークアウトで使った部位名を表示
- 複数部位は中黒（・）区切り（例: 「胸・背中」）
- 部位なしの場合は非表示

### 3. タグ行変更
- 種目数を subtitle から tag 行に移動
- 総重量タグを削除
- 表示順: 種目数 → セット数 → 所要時間

### 4. 完了時ボタンテキスト変更
- 当日完了済みワークアウトがある場合: 「本日のワークアウトを再開する」
- ない場合: 「本日のワークアウトを記録」（従来通り）

## 変更ファイル
- `RecentWorkoutCard.tsx`: props 変更（`primaryMuscleGroup` → `muscleGroups`）、日付フォーマット、部位表示、タグ行
- `HomeScreen.tsx`: `WorkoutSummary.muscleGroups` 追加、全部位収集、ボタンテキスト切替
- テストファイル追加・更新

## データフロー
`buildWorkoutSummary` で全種目の `muscle_group` を重複排除して収集し、`muscleGroups: string[]` として返す。
