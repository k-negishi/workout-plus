# Implementation Plan: カレンダー日付選択の反映不具合修正

**Branch**: `main` | **Date**: 2026-02-21 | **Spec**: [specs/008-calendar-date-selection-fix/spec.md](./spec.md)
**Input**: Feature specification from `specs/008-calendar-date-selection-fix/spec.md`

## Summary

Issue #108 の不具合を解消するため、`MonthCalendar` の日付押下判定を修正し、押下した当日以前の日付が `CalendarScreen` の `selectedDate` と `DaySummary` に反映されるようにする。  
未来日の押下は従来どおり無効のまま維持する。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5  
**Primary Dependencies**: react-native-calendars, date-fns, Jest, @testing-library/react-native  
**Storage**: SQLite（変更なし）  
**Testing**: Jest + React Native Testing Library  
**Target Platform**: iOS / Android (Expo)  
**Project Type**: Mobile app (Expo managed)  
**Performance Goals**: 既存描画パフォーマンス維持（条件式修正のみ）  
**Constraints**: TDD（Red→Green→Refactor）を厳守し、既存 UI マーカー挙動を壊さない  
**Scale/Scope**: `MonthCalendar` と `CalendarScreen` の最小差分 + テスト追加

## Constitution Check

- ローカルファースト: PASS（DB/通信仕様変更なし）
- 引き算のデザイン: PASS（UI 構造追加なし）
- MVP スコープ厳守: PASS（Issue #108 の症状に限定）
- テスト規律: PASS（テスト先行で実施）

## Project Structure

### Documentation (this feature)

```text
specs/008-calendar-date-selection-fix/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/mobile/src/features/calendar/components/MonthCalendar.tsx
apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.tsx
apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx
```

**Structure Decision**: コンポーネント境界を維持し、未来日判定のロジックのみ局所修正する。

## Complexity Tracking

該当なし（新規アーキテクチャや依存追加なし）。
