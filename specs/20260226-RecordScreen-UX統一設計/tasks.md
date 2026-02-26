# Tasks: RecordScreen UX 統一設計

## Task 1: TimerBar ラベル変更テストを書く (Red)
- [ ] `TimerBar.test.tsx` の「終了」→「完了」テストを更新（Red にする）

## Task 2: TimerBar ラベル変更を実装する (Green)
- [ ] `TimerBar.tsx`: ボタンラベル `終了` → `完了`
- [ ] `TimerBar.tsx`: accessibilityLabel `ワークアウトを終了` → `ワークアウトを完了`

## Task 3: RecordScreen の新テストを書く (Red)
- [ ] 編集モード（status=completed）で TimerBar が非表示になるテスト
- [ ] handleComplete で exerciseCount=0 → goBack が呼ばれ WorkoutSummary に遷移しないテスト

## Task 4: RecordScreen を修正する (Green)
- [ ] `isRecordingMode` を追加（`store.currentWorkout?.status === 'recording'`）
- [ ] TimerBar を `isRecordingMode` 条件でレンダリング
- [ ] `handleComplete` で `summary.exerciseCount === 0` 時に Toast + goBack

## Task 5: cleanupExerciseSets フィルタ修正 (Green)
- [ ] `useWorkoutSession.ts`: `(s.reps === 0 && s.weight != null)` → `s.reps === 0`
- [ ] 既存テスト `useWorkoutSession.complete-empty.test.tsx` がパスすることを確認

## Task 6: 全テスト・Lint・型チェック
- [ ] `pnpm --filter mobile test`
- [ ] `pnpm lint`
- [ ] `pnpm --filter mobile tsc --noEmit`
