# 実装計画: カレンダー表示月の自動同期 (Issue #204)

## アーキテクチャ分析

### 既存コードの状態

```
CalendarScreen
  ├─ state: selectedDate (useState → useEffect で targetDate から更新)  ✓ 実装済み
  └─ <MonthCalendar selectedDate={selectedDate} />
       ├─ state: displayMonth (useState(todayMonth))  ← 修正対象
       └─ markedDates: selectedDate ベースで正しく計算  ✓
```

### 変更点のみ

修正は `MonthCalendar.tsx` への `useEffect` 追加のみ。
CalendarScreen・HomeScreen・NavigationTypes は変更不要。

## 実装手順

### T1: テスト作成（Red フェーズ）

`MonthCalendar.test.tsx` を新規作成。
以下のテストケースを含む:

1. **外部 selectedDate 変化で displayMonth が追従する**
   - props.selectedDate を '2026-03-01' → '2026-01-15' に更新
   - カレンダーヘッダーが「1月」になることを確認

2. **同月内の日付変化では displayMonth が変わらない**
   - props.selectedDate を '2026-03-01' → '2026-03-15' に更新
   - displayMonth は変化しないことを確認（月切替アニメーションが発火しない）

3. **初期表示は todayMonth（今月）**
   - selectedDate が今日の場合、カレンダーヘッダーが今月を表示

### T2: 実装（Green フェーズ）

`MonthCalendar.tsx` に以下の `useEffect` を追加:

```typescript
// 外部からの selectedDate 変化（ナビゲーション由来）に displayMonth を同期する
// 依存配列に displayMonth を含めないことで無限ループを防止する
useEffect(() => {
  if (!selectedDate) return;
  const newMonth = startOfMonth(parseISO(selectedDate));
  if (isSameMonth(newMonth, displayMonth)) return;
  setDisplayMonth(newMonth);
  setMonthChangeKey((prev) => prev + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDate]);
```

`parseISO` を `date-fns` から追加インポートする。

### T3: 品質チェック

```bash
pnpm --filter mobile test -- --testPathPattern=MonthCalendar
pnpm --filter mobile tsc --noEmit
pnpm lint
```

### T4: コミット

```bash
git commit -m "fix: MonthCalendar の displayMonth を selectedDate 変化に同期 (#204)"
```

## リスク・注意事項

### `react-hooks/exhaustive-deps` の ESLint 警告

`useEffect` の依存配列から `displayMonth` を意図的に除外するため、
ESLint の `react-hooks/exhaustive-deps` が警告を出す。
`// eslint-disable-next-line` で抑制し、理由をコメントで明記する。

### `monthChangeKey` のインクリメント

`setMonthChangeKey` により `Calendar` が強制リマウントされる。
これは月変更時の既存挙動と同じため、副作用なし。

## 依存関係

```
T1 (テスト) → T2 (実装) → T3 (品質チェック) → T4 (コミット)
```

すべてシリアル実行。並列化なし（ファイル1本の修正のみ）。
