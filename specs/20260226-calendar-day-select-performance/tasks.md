# タスク: カレンダー日付選択パフォーマンス改善

## US-1: 日付タップ→サマリー表示の体感遅延解消

### Phase 1: MonthCalendar 最適化

- [X] T1: `today` 変数を useMemo で安定化する（MonthCalendar.tsx）
- [X] T2: MonthCalendar を React.memo でラップする（MonthCalendar.tsx）

### Phase 2: DaySummary key リマウント廃止

- [X] T3: DaySummary から key={selectedDate} を削除する（CalendarScreen.tsx, DaySummary.tsx）

### 検証

- [X] T4: 全テスト・型チェック・Lint の実行
  - テスト: 5 suites / 61 tests PASS ✅
  - 型チェック: PASS ✅
  - Lint: 変更ファイルにエラーなし ✅（既存エラー1件は無関係）
