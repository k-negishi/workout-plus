# Implementation Plan: RecordScreen UX 統一設計

**Branch**: `20260226-RecordScreen-UX統一設計` | **Date**: 2026-02-26
**Spec**: [spec.md](./spec.md)

## Summary

RecordScreen の 3 モード（新規登録・再開・編集）を統一する UX 改善。
「終了」→「完了」へのラベル変更、編集モードでのタイマー/完了ボタン非表示、
有効セットが 0 件の完了時に Toast + goBack（WorkoutSummary への不正遷移を防ぐ）を実装する。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: React Navigation v7, @testing-library/react-native, Jest 29, Zustand
**Storage**: expo-sqlite（変更なし）
**Testing**: jest-expo（.test.tsx）
**Target Platform**: iOS / Android (Expo Go)
**Performance Goals**: N/A（UI 変更のみ）
**Constraints**: Expo Go バンドル済みネイティブモジュールの制約に従う

## Constitution Check

- **I. ローカルファースト**: ✅ SQLite 操作のみ、ネットワーク不要
- **II. 引き算のデザイン**: ✅ ボタン追加なし、表示を減らす方向
- **III. MVP スコープ厳守**: ✅ 既存画面の UX 修正のみ
- **VI. テスト・品質規律**: ✅ TDD で実装、既存テスト更新必須

## Project Structure

### Documentation

```text
specs/20260226-RecordScreen-UX統一設計/
├── spec.md        ✅
├── plan.md        ← This file
├── tasks.md       → next step
└── checklists/
    └── requirements.md  ✅
```

### Source Code (変更対象)

```text
apps/mobile/src/features/workout/
├── components/
│   └── TimerBar.tsx                        # ① ラベル変更: 終了→完了
├── screens/
│   └── RecordScreen.tsx                    # ② モード分岐・handleComplete 修正
└── hooks/
    └── useWorkoutSession.ts                # ③ cleanupExerciseSets filter 修正

# テストファイル（TDD: 実装前に作成）
apps/mobile/src/features/workout/
├── components/__tests__/TimerBar.test.tsx             # ④ ラベルテスト更新
├── screens/__tests__/RecordScreen.test.tsx            # ⑤ 新テスト追加
└── hooks/__tests__/useWorkoutSession.complete-empty.test.tsx  # ⑥ 既存テスト確認
```

## Implementation Plan

### 変更 ① TimerBar.tsx — ラベル変更

```diff
- <Text ...>終了</Text>
+ <Text ...>完了</Text>
- accessibilityLabel="ワークアウトを終了"
+ accessibilityLabel="ワークアウトを完了"
```

### 変更 ② RecordScreen.tsx — モード分岐 + handleComplete 修正

```typescript
// 追加: 録音モード判定（store.currentWorkout.status で決定）
const isRecordingMode = store.currentWorkout?.status === 'recording';

// 修正: handleComplete — completeWorkout の戻り値を使用
const summary = await session.completeWorkout();
if (summary.exerciseCount === 0) {
  showSuccessToast('記録がないため破棄しました');
  navigation.goBack();
  return;
}
showSuccessToast('ワークアウトを記録しました');
navigation.replace('WorkoutSummary', { workoutId: completedWorkoutId });

// 修正: TimerBar を isRecordingMode 条件付きレンダリング
{isRecordingMode && <TimerBar ... />}
```

### 変更 ③ useWorkoutSession.ts — cleanupExerciseSets filter

```diff
- (s) => s.weight == null || s.reps == null || (s.reps === 0 && s.weight != null)
+ (s) => s.weight == null || s.reps == null || s.reps === 0
```

意味: `reps=0` を weight の有無に関わらず無効セットとして扱う（spec 定義に統一）

## Complexity Tracking

| 項目 | 判断 |
|---|---|
| `isRecordingMode` の初期値 | store が null の間は false → TimerBar が見えない一瞬あり。ローディング状態は既存動作と同じで許容範囲 |
| `showSuccessToast` の再利用 | 破棄時も同じ関数を使う。iOS では Alert title が「完了」になるが現時点では許容 |
