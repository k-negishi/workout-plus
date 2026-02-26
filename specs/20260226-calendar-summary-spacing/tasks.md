# タスク一覧: カレンダーとサマリー間の空白縮小

## US1: カレンダーとサマリー間の空白を適切なサイズに縮小する

- [X] T1: DaySummary.tsx の marginTop を 20 → 8 に変更（3箇所）
  - loading 状態（L197）: `marginTop: 20` → `marginTop: 8`
  - no-workout 状態（L206）: `marginTop: 20` → `marginTop: 8`
  - workout 状態（L218）: `marginTop: 20` → `marginTop: 8`
  - 依存: なし
  - 並列可: -

- [X] T2: 既存テスト・型チェック・Lint の実行確認
  - DaySummary テスト、CalendarScreen テストが通過すること
  - `pnpm --filter mobile tsc --noEmit` が通過すること
  - `pnpm lint` が通過すること
  - 依存: T1

## サマリー

- 総タスク数: 2
- 並列実行可能: なし（T2 は T1 に依存）
