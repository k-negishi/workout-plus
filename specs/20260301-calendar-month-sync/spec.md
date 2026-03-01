# 仕様書: カレンダー表示月の自動同期 (Issue #204)

## 概要

ホーム画面の「直近のワークアウト」カードをタップしてカレンダー画面に遷移したとき、
カレンダーが `targetDate` の月ではなく「今月」で表示される不具合を修正する。

## 背景・問題

### 現象

1. ホーム画面で 1月のワークアウトカードをタップ
2. カレンダー画面に遷移
3. **期待**: 1月のカレンダーが表示され、該当日付がハイライト
4. **実際**: 今月（3月）のカレンダーが表示される。日付ハイライトは正しいが月表示がずれている

### 根本原因

`MonthCalendar.tsx` の `displayMonth` state が `useState(todayMonth)` で初期化されており、
`selectedDate` props の変化（外部ナビゲーション由来）に追従するロジックが存在しない。

```typescript
// MonthCalendar.tsx L105（現状）
const [displayMonth, setDisplayMonth] = useState(todayMonth); // 今月で固定初期化
// selectedDate が変わっても displayMonth は更新されない ← バグ
```

### データフロー（現状）

```
HomeScreen
  └─ navigation.navigate('CalendarTab', { params: { targetDate: '2026-01-15' } })
       └─ CalendarScreen
            ├─ useEffect: setSelectedDate('2026-01-15')  ✓
            └─ <MonthCalendar selectedDate="2026-01-15" />
                 ├─ markedDates: '2026-01-15' がハイライト  ✓
                 └─ displayMonth: todayMonth（今月）のまま  ✗ ← バグ箇所
```

## 要件

### 機能要件

- **FR-1**: `selectedDate` props が外部から更新されたとき（ナビゲーション由来）、
  `displayMonth` をその日付の月に自動更新する
- **FR-2**: ユーザーが月切替ボタン（矢印）・スワイプで月を変更した場合は、
  `selectedDate` の変化で `displayMonth` が上書きされてはならない
  （通常の操作を妨げない）
- **FR-3**: 同月内の日付変更（日付タップ）では `displayMonth` を変更しない

### 非機能要件

- **NFR-1**: 既存の月切替アニメーション（スライド）は変更しない
- **NFR-2**: `react-native-calendars` の `Calendar` コンポーネントの再マウントは最小限に抑える

## スコープ

### 対象ファイル

| ファイル | 変更内容 |
|---|---|
| `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` | `useEffect` で `selectedDate` の月変化を検知して `displayMonth` を更新 |
| `apps/mobile/src/features/calendar/components/MonthCalendar.test.tsx` | 新規作成: 外部 selectedDate 変化で displayMonth が追従するテスト |

### スコープ外

- `CalendarScreen.tsx`: 変更不要（`targetDate → selectedDate` の反映は実装済み）
- `HomeScreen.tsx`: 変更不要
- カレンダー UI・アニメーションの変更

## 実装方針

### 解決策: `useEffect` で月変化を検知

```typescript
// MonthCalendar.tsx に追加
useEffect(() => {
  if (!selectedDate) return;
  const newMonth = startOfMonth(parseISO(selectedDate));
  // 同月内の変化は無視（日付タップなど）
  if (isSameMonth(newMonth, displayMonth)) return;
  setDisplayMonth(newMonth);
  setMonthChangeKey((prev) => prev + 1); // Calendar の強制リマウント
}, [selectedDate]); // displayMonth を依存配列に含めない（無限ループ防止）
```

**なぜ `displayMonth` を依存配列に含めないか**: `setDisplayMonth` が `displayMonth` を変化させ、
それがまた `useEffect` を再発火させる無限ループを防ぐため。
`selectedDate` が変わったときだけ反応させれば十分。

## 受け入れ基準

- [ ] ホームの過去月ワークアウトカードをタップすると、カレンダーがその月で表示される
- [ ] カレンダー内の月切替ボタン・スワイプは正常に動作する（`displayMonth` が `selectedDate` で上書きされない）
- [ ] 同月内の日付タップで `displayMonth` は変化しない
- [ ] テストが通る（Jest）
- [ ] 型チェックが通る（tsc --noEmit）
- [ ] Lint が通る
