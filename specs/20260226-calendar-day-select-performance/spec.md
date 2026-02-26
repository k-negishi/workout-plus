# カレンダー日付選択パフォーマンス改善

## 概要

カレンダー画面で日付をタップしてからDaySummary（ワークアウトサマリー）が表示されるまでの体感遅延を改善する。

## 背景・課題

日付タップ時に以下の処理が直列で走り、ユーザーが「遅い」と感じる：

1. `setSelectedDate` → CalendarScreen 全体が再レンダー
2. MonthCalendar（3パネル Calendar）が**無条件に再レンダー**（memo 化なし）
3. `markedDates` の `useMemo` が `today` の参照不安定で毎回無効化
4. DaySummary が `key={selectedDate}` で毎回フルリマウント → ローディングスピナー表示

## ユーザーストーリー

- **US-1**: カレンダーユーザーとして、日付をタップしたときにサマリーが素早く表示されてほしい（体感遅延の解消）

## 機能要件

### FR-1: MonthCalendar の React.memo 化

- MonthCalendar コンポーネントを `React.memo` でラップする
- `selectedDate` が変わっても MonthCalendar の props（`trainingDates`, `onDayPress`, `onMonthChange`）が同一であれば再レンダーをスキップする
- ただし `selectedDate` は MonthCalendar の props に含まれるため、カスタム比較関数で `markedDates` の実質的な変更のみ再レンダーするか、`selectedDate` による markedDates 更新を MonthCalendar 内部で完結させる設計を検討する

### FR-2: markedDates useMemo の依存配列修正

- `today` 変数を `useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])` で安定化する
- これにより `markedDates` の `useMemo` が `selectedDate` または `trainingDates` が変わったときのみ再計算される

### FR-3: DaySummary の key リマウント廃止（任意）

- `key={selectedDate}` を削除し、props の `dateString` 変更で `useEffect` が refetch する方式に変更する
- 旧データのちらつき防止は `fetchDayData` 先頭の `setLoading(true)` で対応する
- ただし1フレームの旧データ表示が許容できない場合は `key` 方式を維持する

## 非機能要件

- **NFR-1**: 日付タップ→サマリー表示の体感遅延が改善されること（定量基準なし、体感改善）
- **NFR-2**: 既存のカレンダー機能（月切替アニメーション、トレーニング日マーク、日付選択ハイライト、未来日無効化）が壊れないこと

## 対象ファイル

| ファイル | 変更内容 |
|---|---|
| `MonthCalendar.tsx` | React.memo ラップ、today の useMemo 化 |
| `CalendarScreen.tsx` | DaySummary の key 削除（FR-3 実施時） |
| `DaySummary.tsx` | key 削除後のちらつき防止対応（FR-3 実施時） |

## 設計上の注意

### selectedDate と MonthCalendar の関係

MonthCalendar は `selectedDate` を props で受け取り、`markedDates` の計算に使用している。
`React.memo` をかけても `selectedDate` が変わるたびに再レンダーは走る。

**対策案**: `markedDates` を CalendarScreen 側で計算し MonthCalendar に渡す。
MonthCalendar が `selectedDate` を直接持たなくなれば、memo の恩恵が最大化する。
ただし MonthCalendar 内部の `handleDayPress`（未来日判定に today を使う）等の整理が必要。

→ **採用方針**: まず FR-2（today 安定化）を実施し、その上で MonthCalendar の memo 化を行う。
`selectedDate` 変更時の再レンダーは許容するが、`markedDates` の不要な再計算を防ぐことで
Calendar コンポーネント内部の diff が最小化され、体感改善が見込める。

## スコープ外

- DB クエリの最適化（インデックスは既に適切）
- DaySummary のデータプリフェッチ・キャッシュ
