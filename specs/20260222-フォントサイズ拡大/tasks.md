# Tasks: 全体フォントサイズ 1 段階拡大（Issue #118）

**Input**: `specs/20260222-フォントサイズ拡大/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

---

## Phase 1: User Story 1 - タイポグラフィトークン更新（P1） 🎯 MVP

**Goal**: `typography.ts` のトークン値を +2px し、トークン参照コンポーネントを自動更新する

**Independent Test**: `pnpm --filter mobile tsc --noEmit` でエラーなし、Button / EmptyState / NumericInput が正しいフォントサイズで表示される

- [X] T001 [US1] `apps/mobile/src/shared/constants/typography.ts` の fontSize 6 値（xs/sm/md/lg/xl/xxl）を各 +2px 更新（12→14, 14→16, 16→18, 18→20, 20→22, 24→26）
- [X] T002 [US1] `apps/mobile/src/shared/constants/typography.ts` の lineHeight 6 値を各 +4 更新（xs:16→20, sm:20→24, md:24→28, lg:28→32, xl:28→32, xxl:32→36）
- [X] T003 [US1] `pnpm --filter mobile tsc --noEmit` でエラーゼロを確認

**Checkpoint**: typography.ts 更新完了。Button / EmptyState / NumericInput が自動的に新サイズになる。

---

## Phase 2: User Story 2 - ハードコード値の +2px 修正（P2）

**Goal**: トークン非参照のハードコード fontSize 値を全て +2px し、全画面で統一的なフォントサイズアップを実現する

**Independent Test**: 全コンポーネントで小さい文字が残っていないことを目視確認、テストがパスすること

### 2-A: home feature（並列可）

- [X] T004 [P] [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` のハードコード fontSize を +2px（12→14, 14→16, 20→22）
- [X] T005 [P] [US2] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` のハードコード fontSize を +2px（11→13, 12→14, 13→15, 15→17, 18→20）
- [X] T006 [P] [US2] `apps/mobile/src/features/home/components/QuickStatsWidget.tsx` のハードコード fontSize を +2px（13→15, 28→30）
- [X] T007 [P] [US2] `apps/mobile/src/features/home/components/WeeklyGoalsWidget.tsx` のハードコード fontSize を +2px（12→14, 13→15, 16→18, 24→26）
- [X] T008 [P] [US2] `apps/mobile/src/features/home/components/StreakCard.tsx` のハードコード fontSize を +2px（`text-[32px]` → `text-[34px]` を含む）

### 2-B: calendar feature（並列可）

- [X] T009 [P] [US2] `apps/mobile/src/features/calendar/components/DaySummary.tsx` のハードコード fontSize を +2px（11→13, 13→15, 14→16, 15→17）

### 2-C: workout feature（並列可）

- [X] T010 [P] [US2] `apps/mobile/src/features/workout/screens/RecordScreen.tsx` のハードコード fontSize を +2px（12→14, 14→16）
- [X] T011 [P] [US2] `apps/mobile/src/features/workout/components/TimerBar.tsx` のハードコード fontSize を +2px（10→12, 11→13, 13→15, 14→16, 16→18）
- [X] T012 [P] [US2] `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` のハードコード fontSize を +2px（11→13, 12→14, 13→15, 16→18）
- [X] T013 [P] [US2] `apps/mobile/src/features/workout/components/SetRow.tsx` のハードコード fontSize を +2px（11→13, 12→14, 14→16）

### 2-D: exercise feature（並列可）

- [X] T014 [P] [US2] `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` のハードコード fontSize を +2px（11→13, 14→16）

**Checkpoint**: 全ハードコード箇所が +2px 更新完了。

---

## Phase 3: 品質検証

- [X] T015 `pnpm --filter mobile tsc --noEmit` でエラーゼロを確認
- [X] T016 `pnpm --filter mobile test` で全テストパスを確認（スナップショット更新は `--updateSnapshot` で対応）
- [X] T017 `pnpm lint` でエラー・警告ゼロを確認

---

## Dependencies & Execution Order

### フェーズ依存関係

- **Phase 1 (T001-T003)**: 依存なし。即時開始可能
- **Phase 2 (T004-T014)**: Phase 1 完了後に開始。T004〜T014 は全て並列実行可能（異なるファイル）
- **Phase 3 (T015-T017)**: Phase 2 全タスク完了後に実行

### 並列実行チャンス

- T004〜T014 は全て異なるファイルのため、同時実行可能
- Phase 3 の T015, T016, T017 は独立して並列実行可能

---

## Notes

- スナップショットテストが失敗した場合は `pnpm --filter mobile test -- --updateSnapshot` で更新する（フォントサイズ変更による意図的な差異）
- `text-[Npx]` 形式の NativeWind クラスも忘れず対応すること（StreakCard の `text-[32px]` 等）
- 変更後は Expo Go で実機確認を推奨
