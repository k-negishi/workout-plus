# 実装計画: ワークアウト詳細画面の廃止とカレンダー画面への統合

**Issue:** #127
**仕様書:** spec.md

## アーキテクチャ概要

```
変更前:
  HomeScreen → [カードタップ] → WorkoutDetailScreen → [種目タップ] → ExerciseHistory
  CalendarScreen → [日付ヘッダー] → WorkoutDetailScreen → [種目タップ] → ExerciseHistory

変更後:
  HomeScreen → [カードタップ] → CalendarTab (該当日付選択)
  CalendarScreen → DaySummary → [種目タップ] → ExerciseHistory
  CalendarScreen → DaySummary → [削除ボタン] → 確認ダイアログ → 削除
```

## 依存関係グラフ

```
[Phase 1: DB層]
  T1: workout_date カラム追加（マイグレーション V5）
  T2: WorkoutRepository 更新（workout_date 自動セット）

[Phase 2: DaySummary 機能拡張]（T1, T2 に依存）
  T3: DaySummary に種目名タップ → ExerciseHistory 遷移を追加
  T4: DaySummary に削除ボタン追加
  T5: DaySummary の日付ヘッダーからタップ遷移を除去

[Phase 3: ナビゲーション再設計]（T3, T4, T5 に依存）
  T6: CalendarStackParamList に targetDate パラメータ追加
  T7: CalendarScreen で targetDate パラメータを受け取り selectedDate に反映
  T8: HomeScreen のクロスタブナビゲーション実装

[Phase 4: クリーンアップ]（T6, T7, T8 に依存）
  T9: WorkoutDetailScreen 削除 + ルート定義から除去
  T10: 不要な import・型定義の整理
```

## 変更ファイル一覧

| ファイル | 変更種別 | Phase |
|---------|---------|-------|
| `database/migrations.ts` | 修正 | 1 |
| `database/schema.ts` | 修正（JSDoc 追加） | 1 |
| `database/repositories/workout.ts` | 修正 | 1 |
| `database/types.ts` | 修正（WorkoutRow に workout_date 追加） | 1 |
| `features/calendar/components/DaySummary.tsx` | 修正 | 2 |
| `features/calendar/screens/CalendarScreen.tsx` | 修正 | 2, 3 |
| `types/navigation.ts` | 修正 | 3, 4 |
| `features/home/screens/HomeScreen.tsx` | 修正 | 3 |
| `app/HomeStack.tsx` | 修正 | 4 |
| `app/CalendarStack.tsx` | 修正 | 4 |
| `features/workout/screens/WorkoutDetailScreen.tsx` | **削除** | 4 |
| テストファイル群 | 修正/追加 | 各Phase |

## リスク・注意点

### 1. クロスタブナビゲーション
- React Navigation のクロスタブ遷移は `navigate('CalendarTab', { screen: 'Calendar', params: { targetDate } })` で実現可能
- ただし CalendarScreen がすでにマウント済みの場合、`route.params` の変更を検知する必要がある → `useEffect` で `route.params?.targetDate` を監視

### 2. DaySummary のデータ再取得
- 削除後に DaySummary のデータをリフレッシュする必要がある
- 現状 DaySummary は `dateString` の変更で `useEffect` が再発火する設計
- 削除後に `fetchDayData()` を再呼び出しする仕組みが必要 → `refreshKey` prop を追加するか、コールバック内で直接リフレッシュ

### 3. マイグレーション時の既存データ
- 既存の completed ワークアウトに同日のものが複数ある場合（開発データなど）、UNIQUE 制約追加前にデータクリーニングが必要
- マイグレーション内で重複を検出し、古い方を保持（新しい方を削除）するロジックを入れる

### 4. DaySummary の completed_at ベース → workout_date ベースへのクエリ変更
- 現在の DaySummary は `completed_at` の範囲クエリで検索している
- `workout_date` カラム追加後はこちらで検索する方がシンプルだが、既存動作を壊さないように注意
- Phase 1 でカラム追加 → Phase 2 でクエリ変更を検討（ただしスコープ拡大のリスクあり、今回は `completed_at` ベースを維持）

## テスト戦略

- 各 Phase ごとに TDD で進行（Red → Green → Refactor）
- DB マイグレーションテスト: インメモリ SQLite でマイグレーション実行 → カラム存在確認 → UNIQUE 制約テスト
- コンポーネントテスト: `@testing-library/react-native` でレンダリング + ユーザーインタラクション
- ナビゲーションテスト: `navigation.navigate` のモック呼び出し検証
