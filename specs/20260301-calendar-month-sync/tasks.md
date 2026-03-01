# タスク一覧: カレンダー表示月の自動同期 (Issue #204)

## サマリー

- 総タスク数: 4
- 並列実行可能: 0（全タスクシリアル）
- 推定変更ファイル: 2（MonthCalendar.tsx, MonthCalendar.test.tsx）

---

## T1: MonthCalendar テスト作成（Red フェーズ）

- **ファイル**: `apps/mobile/src/features/calendar/components/MonthCalendar.test.tsx`（新規作成）
- **内容**:
  - `selectedDate` が別月に変わったとき `displayMonth` がその月に更新されるテスト
  - 同月内の日付変化では `displayMonth` が変わらないテスト
  - 初期表示が今月であることのテスト
- **完了条件**: テストが **RED**（実装前のため失敗）で通ること
- **並列**: 不可（T2 の前提）

- [ ] T1 完了

---

## T2: MonthCalendar 実装（Green フェーズ）

- **ファイル**: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx`
- **内容**:
  - `parseISO` を `date-fns` import に追加
  - `useEffect` を追加して `selectedDate` 変化 → `displayMonth` 更新
  - `eslint-disable` コメントと理由を明記
- **完了条件**: T1 のテストが **GREEN**（全パス）
- **並列**: 不可（T1 完了後）

- [ ] T2 完了

---

## T3: 品質チェック

- **コマンド**:
  ```bash
  pnpm --filter mobile test -- --testPathPattern=MonthCalendar
  pnpm --filter mobile tsc --noEmit
  pnpm lint
  ```
- **完了条件**: 全コマンドが PASS
- **並列**: 不可（T2 完了後）

- [ ] T3 完了

---

## T4: コミット & Issue クローズ

- **内容**: `/git-commit` スキル実行 → push → Issue #204 クローズ
- **完了条件**: コミット成功、Issue がクローズされる
- **並列**: 不可（T3 完了後）

- [ ] T4 完了
