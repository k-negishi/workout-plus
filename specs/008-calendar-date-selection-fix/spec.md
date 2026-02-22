# Feature Specification: カレンダー日付選択の反映不具合修正

**Feature Branch**: `main`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "Issue #108: カレンダーで特定の日付を押下しても、その日付の情報が表示されない。当日のまま。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 押下した日付の情報を表示する (Priority: P1)

ユーザーがカレンダー上で当日以前の日付を押したとき、下部サマリーが押下日付の内容に切り替わる。

**Why this priority**: Issue の主症状が「日付を押しても当日のまま」であり、日次記録の閲覧体験を直接阻害しているため。

**Independent Test**: CalendarScreen のテストで `MonthCalendar` の `onDayPress` を呼び、`DaySummary` が受け取る `dateString` が押下日付へ更新されることを確認する。

**Acceptance Scenarios**:

1. **Given** カレンダー画面を表示している, **When** 2026-02-10 を押下する, **Then** 下部サマリーは 2026-02-10 の情報を表示する
2. **Given** カレンダー画面を表示している, **When** 当日を押下する, **Then** 下部サマリーは当日の情報を表示する

---

### User Story 2 - 未来日は誤って選択状態にしない (Priority: P1)

ユーザーが未来日を押しても、選択日と下部サマリーは変更されない。

**Why this priority**: 未来日の表示切替は仕様外であり、誤った履歴閲覧と UI 一貫性崩れを招くため。

**Independent Test**: MonthCalendar のテストで未来日の `onDayPress` 呼び出し時に、コールバックが実行されないことを確認する。

**Acceptance Scenarios**:

1. **Given** カレンダー画面で選択日が当日, **When** 明日以降の日付を押下する, **Then** 選択日は変更されない
2. **Given** カレンダー画面で選択日が過去日, **When** 未来日を押下する, **Then** 選択日は過去日のまま維持される

### Edge Cases

- 月跨ぎ（例: 2026-01-31 → 2026-02-01）でも押下日付がそのまま反映されること
- タイムゾーン境界（00:00付近）でも「当日以前は選択可 / 未来日は不可」の判定が崩れないこと

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 当日以前の日付セルを押下した場合、`selectedDate` は押下された `yyyy-MM-dd` 文字列に更新されなければならない
- **FR-002**: `selectedDate` が更新された場合、`DaySummary` へ渡す `dateString` は同じ値でなければならない
- **FR-003**: 未来日セルを押下した場合、`selectedDate` を更新してはならない
- **FR-004**: 既存のトレーニング日マーカー表示（`trainingDates`）は回帰してはならない

### Key Entities

- **SelectedDate**: CalendarScreen が保持する `yyyy-MM-dd` 形式の日付状態。MonthCalendar と DaySummary の連携の中心
- **DaySummaryProps.dateString**: 選択日サマリー表示の入力値。SelectedDate と同一であることが要件

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `MonthCalendar` のテストで「過去日/当日の押下でコールバック実行」「未来日押下で未実行」を自動検証できる
- **SC-002**: `CalendarScreen` のテストで日付押下後に `DaySummary` の `dateString` が更新されることを自動検証できる
- **SC-003**: 対象テスト・lint・型チェックがすべて PASS する
