# Tasks: 不完全セット自動スキップ・PR検出の reps=0 除外

**Feature**: 不完全セット自動スキップ・PR検出の reps=0 除外
**Branch**: main
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Summary

| 総タスク数 | 並列実行可能 | 変更ファイル数 |
|---|---|---|
| 5 | T01（他と独立） | 2（テスト1 + 実装1） |

---

## T01: 🔴 Red - 失敗するテストを書く

**優先度**: P1（TDD必須）
**依存**: なし
**並列**: 可（T02 以降はこのタスク完了後）

テストファイルを新規作成し、現在の実装では失敗する（Red）テストを書く。

**ファイル**: `apps/mobile/src/features/workout/hooks/__tests__/useWorkoutSession.incomplete-set.test.ts`

**テストケース**:
- [ ] `completeWorkout`: weight=80, reps=null のセットが削除される
- [ ] `completeWorkout`: weight=null, reps=10 のセットが削除される
- [ ] `completeWorkout`: weight=80, reps=0 のセットが削除される
- [ ] `completeWorkout`: weight=80, reps=10 の完全なセットは削除されない（後退防止）
- [ ] `completeWorkout`: weight=0, reps=10 の自重セットは削除されない（後退防止）
- [ ] `completeWorkout`: weight=null, reps=null の既存ケースも削除される（後退防止）
- [ ] `checkAndSavePRForExercise`: reps=0 のセットは max_weight PR に使われない
- [ ] `checkAndSavePRForExercise`: reps=0 のセットと正常セット混在時、正常セットだけ PR 判定に使われる

**参考テストパターン**: `useWorkoutSession.edit.test.ts`（リポジトリモックパターン）

---

## T02: 🟢 Green - completeWorkout の削除条件を拡張する

**優先度**: P1
**依存**: T01
**並列**: 不可（T01 完了後、T02 と T03 は並列可）

`useWorkoutSession.ts` の `completeWorkout()` 内の削除フィルタを修正する。

**変更**: `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` L469

```typescript
// Before
const nullSets = sets.filter((s) => s.weight == null && s.reps == null);

// After
// 不完全セット（片方null、またはreps=0かつweight入力済み）も完了時に除外する
const incompleteSets = sets.filter(
  (s) => s.weight == null || s.reps == null || (s.reps === 0 && s.weight != null),
);
```

変数名も `nullSets` → `incompleteSets` に変更する。

---

## T03: 🟢 Green - checkAndSavePRForExercise の PR フィルタに reps > 0 を追加する

**優先度**: P1
**依存**: T01
**並列**: T02 と並列可

`useWorkoutSession.ts` の `checkAndSavePRForExercise()` 内のフィルタを修正する。

**変更**: `apps/mobile/src/features/workout/hooks/useWorkoutSession.ts` L59

```typescript
// Before
const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null);

// After
// reps=0のセットはPR判定から除外する（reps=0は未実施扱い）
const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null && s.reps > 0);
```

---

## T04: ✅ 品質チェック - テスト・型・lint を通す

**優先度**: P1
**依存**: T02, T03

```bash
pnpm --filter mobile test -- --testPathPattern="useWorkoutSession"
pnpm --filter mobile tsc --noEmit
pnpm lint
```

全て PASS であること。

---

## T05: 📦 完了確認

**優先度**: P2
**依存**: T04

- [ ] 全テストグリーン
- [ ] 型チェック PASS
- [ ] lint PASS
- [ ] spec.md の受け入れ基準 SC-001〜SC-004 を満たす
