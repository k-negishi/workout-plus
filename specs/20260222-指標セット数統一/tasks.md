# Tasks: 指標セット数統一

## グループ A1: ホーム指標変更 (#110, #111) — 並列可

- [ ] T01: WeeklyGoalsWidget の prop を `thisWeekVolume` → `thisWeekSets` に変更し、表示を「総セット数」にする
- [ ] T02: WeeklyGoalsWidget のテストを `thisWeekSets` 対応に更新
- [ ] T03: QuickStatsWidget の prop を `longestStreak` → `monthlySetCount` に変更し、行2 を [総セット数, 月間ボリューム] に並び替える
- [ ] T04: HomeScreen の useMemo で `weeklySetCount` と `monthlySetCount` を計算し、各 Widget に渡す

## グループ A2: ワークアウト詳細 (#112) — 並列可

- [ ] T05: WorkoutDetailScreen の概要カードを「総ボリューム」→「総種目数」に変更
- [ ] T06: WorkoutDetailScreen テストを「総種目数」対応に更新

## グループ A3: 種目履歴指標変更 (#113, #114) — 並列可

- [ ] T07: useExerciseHistory の ExerciseStats に `totalSets` と `maxEstimated1RM` を追加
- [ ] T08: calculateStats で `totalSets`（全セット数）と `maxEstimated1RM`（Epley式最高値）を計算する
- [ ] T09: useExerciseHistory のユニットテストに `totalSets` と `maxEstimated1RM` のケースを追加
- [ ] T10: ExerciseHistoryFullScreen の StatCard 「総トレ回数」→「総セット数」「最終PR」→「最高RM」に変更
- [ ] T11: ExerciseHistoryFullScreen のテストのモックに `totalSets` と `maxEstimated1RM` を追加

## グループ A4: カレンダー日次サマリー (#115) — 並列可

- [ ] T12: DaySummary の概要カードを [所要時間, 種目数, セット数, 総ボリューム] に並び替える
- [ ] T13: DaySummary のテストを更新（存在する場合）
