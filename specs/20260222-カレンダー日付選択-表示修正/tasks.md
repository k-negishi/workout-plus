# Tasks: カレンダー日付選択・表示修正

**Feature Branch**: `20260222-カレンダー日付選択-表示修正`
**Created**: 2026-02-22

## Phase 1: テスト作成（TDD）

### T-001: MonthCalendar の日付選択テスト追加
- **ファイル**: `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.ts`
- **内容**: 過去日タップで `onDayPress` が呼ばれること、未来日タップでは呼ばれないことをテスト
- **並列**: [ ]（Phase 1 を先に完了）

## Phase 2: バグ修正

### T-002: handleDayPress の条件ロジック反転バグを修正
- **ファイル**: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx`
- **内容**: `!isBefore(...)` → `isBefore(...)` に修正。タイムゾーン安全な日付比較に変更。
- **依存**: T-001
- **並列**: [ ]

## Phase 3: デザイン修正

### T-003: カレンダー画面のデザイン崩れを修正
- **ファイル**: `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx`、`apps/mobile/src/features/calendar/components/MonthCalendar.tsx`
- **内容**: Issue #108 スクリーンショットを参考にデザイン修正
- **依存**: T-002
- **並列**: [ ]

## Phase 4: 検証

### T-004: 全テストの実行とパス確認
- **コマンド**: `pnpm --filter mobile test`
- **依存**: T-001, T-002, T-003
- **並列**: [ ]

## 完了チェック

- [ ] T-001: テスト追加
- [ ] T-002: バグ修正
- [ ] T-003: デザイン修正
- [ ] T-004: テスト全件パス
