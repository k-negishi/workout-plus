# Implementation Plan: タイマー停止確認モーダル

**Branch**: `004-timer-stop-confirm` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-timer-stop-confirm/spec.md`

## Summary

タイマーバーの × ボタンを押すと「計測を停止しますか？」確認モーダルを表示し、確認後はタイマーのみ停止（`discarded` 状態へ遷移）してワークアウトセッションを継続可能にする。完了時は所要時間なし（`elapsed_seconds = 0` + `timer_status = 'discarded'`）として保存し、サマリー画面では「―」を表示する。

**DBマイグレーション不要**: `timer_status` は TEXT 型のため `'discarded'` をそのまま格納可能。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: expo-sqlite ~15.2.0, React Navigation v7, NativeWind v4, Zustand (workoutSessionStore)
**Storage**: SQLite via expo-sqlite（migration pattern）
**Testing**: Jest + React Native Testing Library（カバレッジ目標 90%+）
**Target Platform**: iOS 16+ / Android 10+（Expo Go）
**Project Type**: モバイル（React Native / Expo）
**Performance Goals**: モーダル表示 < 300ms
**Constraints**: Expo Go 制約（ネイティブモジュール変更不可）、引き算のデザイン原則（Alert.alert を使用）
**Scale/Scope**: 5ファイル変更、新規ファイルなし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 評価 | 根拠 |
|---|---|---|
| I. ローカルファースト | ✅ 準拠 | タイマー状態は即座にSQLiteに永続化（`WorkoutRepository.update`） |
| II. 引き算のデザイン | ✅ 準拠 | `Alert.alert` でシンプルな確認。カスタムモーダル不使用。× ボタンを discarded 後に非表示にして要素を削減 |
| III. MVPスコープ厳守 | ✅ 準拠 | スマホアプリ単独で完結。サーバーサイド変更なし |
| IV. マネージドサービス専用 | ✅ N/A | サーバーサイド変更なし |
| V. 個人開発の持続可能性 | ✅ 準拠 | 変更ファイル5件、新規ファイルなし、複雑度低 |
| VI. テスト・品質規律 | ⚠️ 要対応 | 既存テスト更新 + `stopTimer()` の新規テスト追加が必要 |

**Complexity Tracking**: なし（コンスティテューション違反なし）

## Project Structure

### Documentation (this feature)

```text
specs/004-timer-stop-confirm/
├── plan.md              # このファイル
├── research.md          # 技術的決定の根拠
├── data-model.md        # TimerStatus 型変更、DB変更なし
├── quickstart.md        # テストシナリオ
└── tasks.md             # Phase 2 output（/speckit.tasks で生成）
```

### Source Code（変更ファイル一覧）

```text
apps/mobile/src/
├── types/
│   └── workout.ts                         # TimerStatus に 'discarded' を追加
├── features/workout/
│   ├── hooks/
│   │   ├── useTimer.ts                    # stopTimer() を追加
│   │   └── __tests__/
│   │       └── useTimer.test.ts           # stopTimer テストを追加
│   ├── components/
│   │   └── TimerBar.tsx                   # onDiscard → onStopTimer、discarded UI
│   └── screens/
│       ├── RecordScreen.tsx               # handleDiscard 動作変更（timer.stopTimer 呼び出し）
│       ├── WorkoutSummaryScreen.tsx        # timer_status=discarded → 「―」表示
│       └── __tests__/
│           ├── RecordScreen.test.tsx      # 確認モーダルのテスト更新
│           └── WorkoutSummaryScreen.test.tsx # discarded 時の表示テスト追加
```

**Structure Decision**: モバイル単独（Option 3相当）。既存のフィーチャーモジュール構成（`features/workout/`）を維持。新規ファイルは作成しない。

## 実装詳細

### 1. `TimerStatus` 型拡張（`types/workout.ts`）

```typescript
export type TimerStatus = 'notStarted' | 'running' | 'paused' | 'discarded';
```

### 2. `useTimer` フックに `stopTimer()` を追加（`hooks/useTimer.ts`）

```typescript
// discarded 状態に遷移し、タイマーをクリアする
const stopTimer = useCallback(() => {
  clearTimerInterval();
  setTimerStatus('discarded');
  setElapsedSeconds(0);
  setTimerStartedAt(null);
  void persistTimerState('discarded', 0, null);
}, [clearTimerInterval, setTimerStatus, setElapsedSeconds, setTimerStartedAt, persistTimerState]);
```

### 3. `TimerBar` コンポーネント変更（`components/TimerBar.tsx`）

- `onDiscard` → `onStopTimer` にリネーム
- `accessibilityLabel` を「時間計測を停止」に変更
- `discarded` 状態では:
  - × ボタン: 非表示（`timerStatus !== 'discarded'` の場合のみ表示）
  - ▶ ボタン: 無効化（`disabled={timerStatus === 'discarded'}`）
  - 経過時間表示: 「時間なし」（`color: '#94a3b8'`）に変更

### 4. `RecordScreen` の `handleDiscard` 変更（`screens/RecordScreen.tsx`）

```typescript
// 変更前: session.discardWorkout() + navigation.getParent()?.goBack()
// 変更後: timer.stopTimer() のみ（ワークアウト継続）
const handleStopTimer = useCallback(() => {
  Alert.alert('計測を停止しますか？', 'タイマーの時間は記録されません。ワークアウトは継続できます。', [
    { text: 'キャンセル', style: 'cancel' },
    {
      text: '停止する',
      style: 'destructive',
      onPress: () => timer.stopTimer(),
    },
  ]);
}, [timer]);
```

### 5. `WorkoutSummaryScreen` の時間表示変更

```typescript
// DBクエリに timer_status を追加
const workout = await db.getFirstAsync<{
  elapsed_seconds: number;
  timer_status: string;
}>('SELECT elapsed_seconds, timer_status FROM workouts WHERE id = ?', [workoutId]);

// 表示ロジック
const durationText = workout.timer_status === 'discarded' ? '―' : formatDuration(workout.elapsed_seconds);
```

## 依存関係

```
T001: TimerStatus 型拡張
  ↓
T002: useTimer に stopTimer() 追加（T001 完了後）
  ↓
T003: TimerBar の onDiscard → onStopTimer リネーム + discarded UI（T001 完了後）
  ↓
T004: RecordScreen の handleDiscard 変更（T002, T003 完了後）
T005: WorkoutSummaryScreen の discarded 対応（T001 完了後、並列可）
  ↓
T006: テスト更新（T002〜T005 完了後）
```

## 実装戦略

1. **MVP（最小限の変更）**: T001〜T005 を順次実装（型 → ロジック → UI → テスト）
2. **テスト**: 既存テストを更新し、新しい `stopTimer` と確認モーダルの動作をカバー
3. **DB**: マイグレーション不要（TEXT 型のため `'discarded'` をそのまま格納可能）
4. **リグレッション注意点**: `TimerBar` の `onDiscard` プロップを使用している箇所（`RecordScreen` のみ）をすべて更新すること
