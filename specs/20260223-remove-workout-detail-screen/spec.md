# 仕様書: ワークアウト詳細画面の廃止とカレンダー画面への統合

**Issue:** #127
**ステータス:** Draft
**作成日:** 2026-02-23

## 概要

ワークアウト詳細画面（WorkoutDetailScreen）を廃止し、カレンダー画面の DaySummary コンポーネントに機能を統合する。ナビゲーションをカレンダー中心に再設計し、1日1ワークアウト制約を DB + UI レベルで導入する。

## 背景・動機

- DaySummary が WorkoutDetailScreen とほぼ同じ情報（サマリー統計、種目別セット詳細）を表示しており、画面が重複している
- ナビゲーションの簡素化: ホーム → 詳細 → 種目履歴 の3段階を、ホーム → カレンダー → 種目履歴 の2段階に短縮
- 1日1ワークアウトはビジネスルールとして合理的（同日の分割トレーニングは1つのワークアウト内で完結させる設計）

## 要件

### R1: ホーム画面のナビゲーション変更

| 操作 | 変更前 | 変更後 |
|------|--------|--------|
| 最近のワークアウトカードタップ | HomeStack → WorkoutDetail | CalendarTab へクロスタブ遷移 + 該当日付を選択 |

**クロスタブ遷移の仕様:**
- `navigation.navigate('CalendarTab', { screen: 'Calendar', params: { targetDate: 'yyyy-MM-dd' } })` で遷移
- CalendarScreen は `targetDate` パラメータを受け取り、`selectedDate` 状態を更新する
- CalendarTab の `CalendarStackParamList` の `Calendar` ルートに `targetDate?: string` パラメータを追加

**必要な情報の取得:**
- 最近のワークアウトの `completed_at`（UNIX ミリ秒）から `yyyy-MM-dd` 文字列を算出する
- HomeScreen の `handleWorkoutPress` コールバックを変更

### R2: DaySummary に種目名タップ → ExerciseHistory 遷移を追加

| 操作 | 変更前 | 変更後 |
|------|--------|--------|
| DaySummary 内の種目名タップ | なし（Text のみ） | ExerciseHistory 画面へ遷移 |

**DaySummary の Props 変更:**
```typescript
type DaySummaryProps = {
  dateString: string;
  onNavigateToDetail?: (workoutId: string) => void;  // 削除
  onNavigateToExerciseHistory?: (exerciseId: string, exerciseName: string) => void;  // 追加
};
```

- 種目名を `Pressable` でラップし、タップ時に `onNavigateToExerciseHistory` を呼ぶ
- 種目名の色を `#4D94FF`（メインカラー）にしてタップ可能であることを示す
- CalendarScreen 側で `navigation.navigate('ExerciseHistory', { exerciseId, exerciseName })` を実行

### R3: DaySummary に削除ボタンを追加

- DaySummary のワークアウト表示エリアの最下部に「ワークアウトを削除」ボタンを配置
- スタイル: 赤文字テキストボタン（WorkoutDetailScreen と同じパターン）
- タップ → 確認ダイアログ表示 → 確認後に `WorkoutRepository.delete(workoutId)` を実行
- 削除後はデータを再取得して DaySummary をリフレッシュ（「この日はトレーニングなし」表示に切り替わる）

**DaySummary の Props 追加:**
```typescript
onDeleteWorkout?: (workoutId: string) => void;  // 追加
```

- 削除ロジック自体は CalendarScreen で実行し、成功トーストも CalendarScreen が表示
- CalendarScreen は削除後にカレンダーのマーキングも更新

### R4: DaySummary の日付ヘッダーの変更

- 現在の日付ヘッダーは `Pressable` + `ChevronRight` で WorkoutDetail への遷移を示唆している
- WorkoutDetail を廃止するため、日付ヘッダーのタップ遷移と `ChevronRight` アイコンを削除
- `onNavigateToDetail` prop を削除

### R5: WorkoutDetailScreen の廃止

- `WorkoutDetailScreen.tsx` を削除
- HomeStack / CalendarStack から `WorkoutDetail` ルート定義を削除
- `navigation.ts` の `HomeStackParamList` / `CalendarStackParamList` から `WorkoutDetail` を削除

### R6: 1日1ワークアウト制約

#### DB レベル

新規マイグレーション（V4 → V5）で以下を実行:

1. `workouts` テーブルに `workout_date TEXT` カラムを追加
   - `completed_at`（UNIX ミリ秒）から `'yyyy-MM-dd'` 形式に変換した値を格納
   - status が `'completed'` のワークアウトのみ NOT NULL（`'recording'` 中は NULL 許容）
2. 既存データのマイグレーション: 完了済みワークアウトの `completed_at` から `workout_date` を算出して埋める
3. UNIQUE インデックス: `CREATE UNIQUE INDEX idx_workouts_unique_date ON workouts(workout_date) WHERE workout_date IS NOT NULL`
   - 部分インデックスにより recording 中（workout_date = NULL）は制約対象外

**設計判断 — なぜ `workout_date` カラムを新設するか:**
- `completed_at` は UNIX ミリ秒（INTEGER）であり、日付単位の UNIQUE 制約を直接かけられない
- `workout_date` を TEXT で持つことで SQLite の部分インデックスで制約可能
- `completed_at` からの導出値なので Repository 層で自動セットする（手動更新不可）

#### UI レベル

- CalendarScreen の「記録・編集」ボタン: 既存ワークアウトがあれば**編集モード**、なければ**新規作成**（現状の動作を維持）
- HomeScreen の記録ボタン: 当日完了済みワークアウトがあれば**編集モード**に遷移（現状の動作を維持）
- RecordScreen でセッション開始時: `WorkoutRepository.findCompletedByDate(targetDate)` で既存チェック、あれば継続/編集

#### Repository 層

- `WorkoutRepository.update()`: ワークアウト完了時（status → 'completed'）に `workout_date` を自動セット
- `WorkoutRepository.create()`: `workout_date` は初期状態（recording）では NULL

## スコープ外

- DaySummary のデザイン刷新（既存レイアウトに削除ボタンと種目名タップを追加するのみ）
- カレンダー画面の MonthCalendar コンポーネントの変更
- 統計画面・AI画面への影響
- WorkoutSummaryScreen（完了サマリー画面）の変更
- RecordScreen の変更（ナビゲーションパラメータ変更なし）

## テスト要件

### ナビゲーション

1. HomeScreen: 最近のワークアウトカードタップ → CalendarTab の該当日付に遷移すること
2. DaySummary: 種目名タップ → ExerciseHistory 画面に遷移すること（正しい exerciseId, exerciseName が渡されること）
3. DaySummary: 日付ヘッダーはタップ不可（ChevronRight なし）

### 削除機能

4. DaySummary: 「ワークアウトを削除」タップ → 確認ダイアログが表示されること
5. 確認ダイアログ「削除」タップ → ワークアウトが削除され、DaySummary が「この日はトレーニングなし」表示に切り替わること
6. 確認ダイアログ「キャンセル」タップ → ワークアウトが残ること

### 1日1ワークアウト制約

7. DB: 同日に2つ目の completed ワークアウトを INSERT しようとすると UNIQUE 制約エラーになること
8. DB: recording 状態（workout_date = NULL）は UNIQUE 制約の対象外であること
9. DB: マイグレーション後、既存の completed ワークアウトに workout_date が正しくセットされること

### 画面削除

10. WorkoutDetailScreen がナビゲーションスタックに存在しないこと（型レベルで WorkoutDetail ルートが消えること）
