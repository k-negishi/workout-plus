# Implementation Plan: 登録画面改善

**Branch**: `20260223-登録画面改善` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)

## Summary

登録画面（RecordScreen）の3つのバグを修正する。根本原因は全て既存コードのロジックの不整合であり、DBスキーマの変更は不要。最小限のコード変更で各問題を解消する。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: Zustand, expo-sqlite ~15.2.0, React Navigation v7, NativeWind v4
**Storage**: SQLite (expo-sqlite) - スキーマ変更なし
**Testing**: Jest 29 + @testing-library/react-native（カバレッジ目標90%+）
**Target Platform**: iOS / Android (Expo Go)
**Project Type**: Mobile (Expo managed workflow)
**Performance Goals**: 変更なし（UI/ロジック修正のみ）
**Constraints**: Expo Go 制約（ネイティブコード変更不可）、NativeWind v4ルール適用
**Scale/Scope**: 3ファイル変更、テスト3〜4ファイル追加/更新

## Constitution Check

### I. ローカルファースト ✅
- 全変更はローカルSQLite操作のロジック修正のみ
- オフライン動作に影響なし

### II. 引き算のデザイン ✅
- タイマーボタン: 文言変更のみ（「完了」→「終了」）。レイアウト変更なし
- 新UIコンポーネント追加なし

### III. MVPスコープ厳守 ✅
- 既存バグの修正のみ。新機能追加なし

### IV. マネージドサービス専用 ✅
- 対象外（モバイルのみの変更）

### V. 個人開発の持続可能性 ✅
- 変更ファイル数: 4ファイル（修正3 + テスト追加/更新）
- DB変更なし → マイグレーション不要

### VI. テスト・品質規律 ✅
- TDD必須: 各修正に対してテストを先に作成する（Red → Green → Refactor）
- 既存テストを破壊しないことを確認
- カバレッジ90%+を維持

## Project Structure

### Documentation (this feature)

```text
specs/20260223-登録画面改善/
├── plan.md              # このファイル
├── research.md          # バグ調査結果
└── tasks.md             # タスク分解（/speckit.tasks で生成）
```

### Source Code (変更対象ファイル)

```text
apps/mobile/src/
├── features/workout/
│   ├── hooks/
│   │   ├── useWorkoutSession.ts            # [修正] Bug1: startSession の findRecording スキップ
│   │   ├── usePreviousRecord.ts            # [修正] Bug3: currentWorkoutCreatedAt パラメータ追加
│   │   └── __tests__/
│   │       ├── useWorkoutSession.test.ts   # [更新] Bug1のテスト追加
│   │       └── usePreviousRecord.test.ts   # [更新] Bug3のテスト追加
│   ├── components/
│   │   ├── TimerBar.tsx                   # [修正] Bug2: ボタン文言「完了」→「終了」
│   │   └── __tests__/
│   │       └── (TimerBar に文言テストを追加)
│   └── screens/
│       └── RecordScreen.tsx               # [修正] Bug3: currentWorkoutCreatedAt を渡す
```

## 各バグの修正詳細

### Bug 1: データ保持問題（useWorkoutSession.ts）

**変更箇所**: `startSession()` 内の `findRecording()` 呼び出し前に `if (!targetDate)` 条件を追加

```typescript
// Before
const existing = await WorkoutRepository.findRecording();
if (existing) {
  // 復元処理
  return;
}

// After
if (!targetDate) {  // ← targetDate指定時はスキップ
  const existing = await WorkoutRepository.findRecording();
  if (existing) {
    // 復元処理
    return;
  }
}
```

**理由**: `targetDate` 指定時は「指定日付での新規記録」なので、別日の recording セッションを復元すべきでない。`workoutId` 指定時はすでに `return` しているので影響なし。

### Bug 2: タイマーボタン文言（TimerBar.tsx）

**変更箇所**: `<Text>完了</Text>` → `<Text>終了</Text>`（L172付近）
`accessibilityLabel="ワークアウトを完了"` → `"ワークアウトを終了"` も更新

### Bug 3: 前回セット日付整合性（usePreviousRecord.ts + RecordScreen.tsx）

**usePreviousRecord.ts の変更**:
1. 引数に `currentWorkoutCreatedAt: number | null` を追加
2. SQL に `AND w.created_at < ?` 条件を追加

```typescript
// Before
export function usePreviousRecord(
  exerciseId: string,
  currentWorkoutId: string | null,
): UsePreviousRecordReturn

// After
export function usePreviousRecord(
  exerciseId: string,
  currentWorkoutId: string | null,
  currentWorkoutCreatedAt: number | null,  // ← 追加
): UsePreviousRecordReturn
```

SQL変更:
```sql
-- Before
WHERE we.exercise_id = ? AND w.status = 'completed' [AND w.id != ?]
ORDER BY w.created_at DESC LIMIT 1

-- After
WHERE we.exercise_id = ? AND w.status = 'completed' [AND w.id != ?]
  [AND w.created_at < ?]                     ← 追加
ORDER BY w.created_at DESC LIMIT 1
```

**RecordScreen.tsx の変更**:
`ExerciseBlockWithPrevious` に `currentWorkoutCreatedAt` プロップを追加し、`store.currentWorkout?.createdAt ?? null` を渡す。

## Complexity Tracking

変更はすべてシンプルなバグ修正。新しい抽象化や設計パターンの導入はなし。

| 修正 | 複雑度 | 理由 |
|------|--------|------|
| Bug 1 (startSession) | 低 | if 条件1行追加 |
| Bug 2 (TimerBar文言) | 最低 | テキスト変更のみ |
| Bug 3 (usePreviousRecord) | 低 | 引数1つ追加 + SQL条件1つ追加 |
