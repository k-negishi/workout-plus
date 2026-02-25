# Implementation Plan: 不完全セット自動スキップ・PR検出の reps=0 除外

**Branch**: `main`（CLAUDE.md 規定により main で作業）
**Date**: 2026-02-26
**Spec**: [spec.md](./spec.md)

## Summary

`useWorkoutSession.ts` の2箇所を修正する最小スコープの変更。

1. `completeWorkout()` の空セット削除条件を「両方null」から「片方でもnull または reps=0（weightあり）」に拡張
2. `checkAndSavePRForExercise()` のフィルタに `s.reps > 0` を追加してreps=0セットをPR判定から除外

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Zustand, expo-sqlite
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: React Native / Expo SDK 52
**Scope**: `useWorkoutSession.ts` のみ（UI変更なし）

## Constitution Check

- ✅ テストなしでプロダクションコードを書かない（TDD必須）
- ✅ 既存パターン踏襲（`useWorkoutSession.edit.test.ts` のモックパターンを使用）
- ✅ 最小変更（変更ファイル1つ、変更行数 ~4行）

## Project Structure

```text
specs/20260226-不完全セット-スキップ-PR検出修正/
├── spec.md   ✅
├── plan.md   ✅（このファイル）
└── tasks.md  （次に作成）

apps/mobile/src/features/workout/hooks/
├── useWorkoutSession.ts                        ← 変更対象（2箇所）
└── __tests__/
    └── useWorkoutSession.incomplete-set.test.ts  ← 新規テストファイル
```

## 変更詳細

### 変更箇所 1: `completeWorkout()` L469

```typescript
// Before
const nullSets = sets.filter((s) => s.weight == null && s.reps == null);

// After
// 不完全セット（片方null、またはreps=0かつweight入力済み）も完了時に除外する
const incompleteSets = sets.filter(
  (s) => s.weight == null || s.reps == null || (s.reps === 0 && s.weight != null),
);
```

### 変更箇所 2: `checkAndSavePRForExercise()` L59

```typescript
// Before
const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null);

// After
// reps=0のセットはPR判定から除外する（reps=0は未実施扱い）
const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null && s.reps > 0);
```

## TDD フロー

1. 🔴 Red: `useWorkoutSession.incomplete-set.test.ts` に失敗するテストを書く
2. 🟢 Green: 上記2箇所の変更でテストを通す
3. ✅ Refactor: lint / 型チェック / 全テスト通過を確認
