# 実装計画: カレンダー日付選択パフォーマンス改善

## アーキテクチャ方針

最小変更で最大効果を得る。MonthCalendar の不要な再レンダーを防ぎ、DaySummary の表示遅延を体感的に解消する。

## 実装ステップ

### Phase 1: MonthCalendar の最適化（FR-1, FR-2）

#### 1-1. `today` の参照安定化

**ファイル**: `MonthCalendar.tsx`

- L101 の `const today = format(new Date(), 'yyyy-MM-dd')` を `useMemo` でラップ
- これにより L136-171 の `markedDates` useMemo が `selectedDate` / `trainingDates` 変更時のみ再計算される

**リスク**: 日付をまたいだ場合に `today` が古くなる → カレンダー画面に長時間滞在するケースは稀なため許容

#### 1-2. MonthCalendar の React.memo 化

**ファイル**: `MonthCalendar.tsx`

- `export function MonthCalendar` → `export const MonthCalendar = React.memo(function MonthCalendar(...) { ... })`
- CalendarScreen 側の `handleDayPress`, `onMonthChange` は既に `useCallback` でメモ化済み → memo が有効に機能する

**効果**: `selectedDate` が変わっても `trainingDates` / `onDayPress` / `onMonthChange` が同一なら再レンダースキップ

**注意**: `selectedDate` は MonthCalendar の props に含まれるため、日付タップのたびに再レンダーは走る。
しかし `markedDates`（useMemo）が安定化していれば、Calendar コンポーネント内部の vDom diff が高速化する。

### Phase 2: DaySummary の key リマウント廃止（FR-3）

**ファイル**: `CalendarScreen.tsx`, `DaySummary.tsx`

#### 2-1. CalendarScreen から key={selectedDate} を削除

- `<DaySummary key={selectedDate} ...>` → `<DaySummary dateString={selectedDate} ...>`
- DaySummary はアンマウント→リマウントではなく、props 変更による再レンダーになる

#### 2-2. DaySummary で dateString 変更時の即座なデータクリア

- `fetchDayData` の先頭で `setLoading(true)` しているため、基本的にはそのまま動く
- ただし `useEffect` は paint 後に実行されるため、1フレームの旧データ表示がありうる
- 必要であれば `dateString` を `useRef` で前回値と比較し、変わっていれば即座に state リセットする

## 依存関係

```
1-1 (today 安定化) → 1-2 (memo 化) → 2-1 (key 削除) → 2-2 (ちらつき防止)
```

1-1 と 1-2 は同一ファイルなので一括実施可能。
2-1 と 2-2 は Phase 1 完了後に実施。

## テスト方針

- 既存の `MonthCalendar.test.tsx`、`CalendarScreen.test.tsx`、`DaySummary.test.tsx` が全てパスすること
- パフォーマンス改善は手動確認（iOS シミュレーターで日付タップの体感確認）

## リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| memo 化で選択日ハイライトが更新されない | 中 | selectedDate が props にあるため memo でも再レンダーされる → 問題なし |
| key 削除で旧データちらつき | 低 | fetchDayData の setLoading(true) でカバー。問題あれば key 方式に戻す |
| today が日付跨ぎで古い | 低 | 長時間滞在は稀。useFocusEffect で更新する手もあるが過剰対応 |
