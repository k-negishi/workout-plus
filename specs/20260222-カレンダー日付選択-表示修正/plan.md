# Implementation Plan: カレンダー日付選択・表示修正

**Feature Branch**: `20260222-カレンダー日付選択-表示修正`
**Created**: 2026-02-22
**Status**: Draft

## Summary

カレンダー画面で日付をタップしても選択日が更新されないバグを修正する。
根本原因は `MonthCalendar.tsx` の `handleDayPress` における条件ロジックの反転（`!isBefore` が正しくは `isBefore` であるべき）。
また、タイムゾーン起因の日付判定ズレとデザイン崩れも合わせて修正する。

## Technology Stack

- TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
- react-native-calendars（MonthCalendar で使用中）
- date-fns（日付操作）
- NativeWind v4（スタイリング）
- Jest 29 + @testing-library/react-native（テスト）

## Architecture

### 修正対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` | `handleDayPress` の条件ロジック反転バグ修正・タイムゾーン対応 |
| `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.ts` | 日付選択のテスト追加 |
| `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` | 統合テスト追加（必要に応じて） |

### バグ詳細

**MonthCalendar.tsx:104-116 の条件ロジック反転:**
```typescript
// 現在（バグ）: !isBefore → 未来日のみ onDayPress が呼ばれる
if (!isBefore(selected, new Date(todayDate.getTime() + 86400000))) {
  onDayPress(day.dateString);
}

// 修正後: isBefore → 今日以前なら onDayPress が呼ばれる
if (isBefore(selected, new Date(todayDate.getTime() + 86400000))) {
  onDayPress(day.dateString);
}
```

**タイムゾーン問題:**
`new Date(day.dateString)` は 'yyyy-MM-dd' 形式の文字列を UTC として解釈するため、
JST+9 環境では前日の 09:00:00 として扱われる可能性がある。
`parseISO` または日付文字列を直接比較する方法に変更する。

## Constraints

- Expo Go の制約: ネイティブモジュールのバージョン変更不可
- テストなしでプロダクションコードを書いてはならない（CLAUDE.md 必須ルール）

## Assumptions

- デザイン崩れはカレンダー画面全体のレイアウトまたはスタイリング問題。Issue のスクリーンショットを参考に実装フェーズで確認。
- バグ修正のみのため、新規ライブラリの追加は不要。
