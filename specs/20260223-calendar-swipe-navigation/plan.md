# 実装計画: カレンダーフリックで前後月ナビゲーション

- **Feature ID**: 20260223-calendar-swipe-navigation
- **作成日**: 2026-02-23

---

## アーキテクチャ方針

### 状態管理の場所

`MonthCalendar` コンポーネント内に `displayMonth` state を持つ（自己完結型）。

**理由:**
- `CalendarScreen` は月の表示を制御する必要がない。日付選択（`selectedDate`）とトレーニング日（`trainingDates`）だけに関心を持てばよい
- `MonthCalendar` が表示月を自己管理することで、CalendarScreen のロジックが増えない
- テストでも `MonthCalendar` 単体でフリック動作を検証できる

### ジェスチャー検出方法

`PanResponder`（React Native 標準）を使用する。

**比較:**

| 方法 | メリット | デメリット | 推奨 |
|------|---------|-----------|------|
| PanResponder | 追加ライブラリ不要、React Native 標準 | 設定がやや冗長 | ✅ |
| react-native-gesture-handler | 高機能、GestureDetector API | 既存コードへの影響あり | ❌ |
| react-native-calendars の swipe | 不明 (ライブラリ次第) | react-native-calendars に実装なし | ❌ |

### 月切り替え方法

`react-native-calendars` の `Calendar` は `current` prop で表示月を制御できる。
`displayMonth` state（`'yyyy-MM-dd'` 形式）を `current` prop に渡す。

---

## コンポーネント設計

### MonthCalendar の変更

```tsx
type MonthCalendarProps = {
  trainingDates: Date[];
  selectedDate: string | null;
  onDayPress: (dateString: string) => void;
  onMonthChange?: (dateString: string) => void;
  // 新規追加なし（currentMonth は内部状態として管理）
};

// 内部状態
const [displayMonth, setDisplayMonth] = useState(format(new Date(), 'yyyy-MM-dd'));

// PanResponder でフリックを検出
const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
    onPanResponderRelease: (_, { dx }) => {
      if (dx < -50) goToNextMonth();      // 左フリック → 翌月
      else if (dx > 50) goToPrevMonth();  // 右フリック → 前月
    },
  })
).current;
```

**未来月の制限ロジック:**
```tsx
const goToNextMonth = () => {
  const next = addMonths(parseISO(displayMonth), 1);
  const now = startOfMonth(new Date());
  if (!isAfter(next, now)) {
    const nextStr = format(next, 'yyyy-MM-dd');
    setDisplayMonth(nextStr);
    onMonthChange?.(nextStr);
  }
};
```

---

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `MonthCalendar.tsx` | `displayMonth` state、`PanResponder`、`goToPrevMonth`/`goToNextMonth` 追加 |
| `MonthCalendar.component.test.tsx` | フリックジェスチャーのテストケース追加（PanResponder モック） |
| `CalendarScreen.tsx` | 変更なし（MonthCalendar が自己完結するため） |
| `CalendarScreen.test.tsx` | 変更なし |

---

## テスト戦略（TDD）

### Red フェーズ: 先にテストを書く

1. `MonthCalendar.component.test.tsx` に以下のテストケースを追加:
   - 左フリック（dx = -100）で `onMonthChange` が翌月の日付で呼ばれる
   - 右フリック（dx = 100）で `onMonthChange` が前月の日付で呼ばれる
   - 縦スクロール（dx = 10, dy = 60）ではフリックが発動しない
   - 当月で左フリックしても未来月には移動しない（today = 2026-02-xx の場合、2026-03-xx には移動しない）

2. PanResponder のテストはイベントをモックして `onPanResponderRelease` を直接呼ぶ

### Green フェーズ: 実装

`MonthCalendar.tsx` に `PanResponder` と月切り替えロジックを実装

### Refactor フェーズ

- `goToPrevMonth` / `goToNextMonth` の重複ロジックを整理
- `isBeforeOrSameMonth` などのヘルパーを抽出するか検討

---

## 依存関係

| 依存 | 詳細 |
|------|------|
| `date-fns` | `addMonths`, `subMonths`, `parseISO`, `startOfMonth`, `isAfter` — すでに導入済み |
| `react-native-calendars` | `current` prop のサポートを確認済み |
| 追加ライブラリ | なし |

---

## リスク・注意事項

1. **`current` prop の動作確認**: `react-native-calendars` の `Calendar` は `current` が変わると表示月を更新する。ただし内部状態との競合に注意（矢印ボタンで移動した後にフリックすると `displayMonth` との不整合が起きる可能性）。矢印ボタンの `onMonthChange` でも `displayMonth` を更新することで解決する。

2. **PanResponder と ScrollView の競合**: `CalendarScreen` は `ScrollView` 内に `MonthCalendar` を配置している。`onMoveShouldSetPanResponder` で水平方向の移動量が垂直より大きい場合のみ認識することで、縦スクロールとの共存を実現する。
