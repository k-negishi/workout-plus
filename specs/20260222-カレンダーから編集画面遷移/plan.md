# Implementation Plan: カレンダーから編集画面遷移

**Branch**: `20260222-カレンダーから編集画面遷移` | **Date**: 2026-02-22
**Spec**: `specs/20260222-カレンダーから編集画面遷移/spec.md`

## Summary

`CalendarStack` に `WorkoutEdit` 画面を追加し、カレンダータブから
`WorkoutDetail → WorkoutEdit` の遷移を可能にする。
`HomeStack` では既に実装済みであり、`CalendarStack` への追加のみで解決できる。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: React Navigation v7 (createNativeStackNavigator)
**Storage**: N/A（UIナビゲーション変更のみ）
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: iOS / Android（Expo Go）
**Project Type**: mobile
**Constraints**: Expo Go 互換 ・ 既存の HomeStack 動作をデグレさせない

## Root Cause Analysis

```
CalendarStack → WorkoutDetail → navigate('WorkoutEdit') → ❌ Not registered
HomeStack    → WorkoutDetail → navigate('WorkoutEdit') → ✅ 登録済み
```

`WorkoutDetailScreen` は `HomeStack`・`CalendarStack` 両方で使用されているが、
`CalendarStackParamList` に `WorkoutEdit` が未定義 + `CalendarStack` に画面未登録のため
ランタイムエラーが発生する。

## Project Structure

```text
apps/mobile/src/
├── types/
│   └── navigation.ts          # CalendarStackParamList に WorkoutEdit を追加
└── app/
    └── CalendarStack.tsx       # WorkoutEditScreen を登録

specs/20260222-カレンダーから編集画面遷移/
├── plan.md
└── tasks.md
```

## Implementation Phases

### Phase 1: 型定義の更新（非破壊）

`CalendarStackParamList` に `WorkoutEdit: { workoutId: string }` を追加する。
`HomeStackParamList` の既存定義は変更しない。

### Phase 2: CalendarStack への画面登録

`CalendarStack.tsx` に `WorkoutEditScreen` を import して `Stack.Screen` として追加する。

### Phase 3: テスト追加

CalendarStack に WorkoutEdit が登録されていることを確認するテストを追加する。
