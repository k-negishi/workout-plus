# 仕様書: カレンダーフリックで前後月ナビゲーション

- **Feature ID**: 20260223-calendar-swipe-navigation
- **GitHub Issue**: #129
- **作成日**: 2026-02-23
- **ステータス**: Draft

---

## 概要

カレンダー画面（CalendarScreen）で横フリック（スワイプ）することで、前月・翌月へ移動できるようにする。
現在は矢印ボタンのみで月移動が可能だが、フリックジェスチャーを追加することでモバイルの自然な操作感を提供する。

---

## ユーザーストーリー

| ID | ストーリー |
|----|-----------|
| US-1 | カレンダーを左にフリックすると翌月に移動したい |
| US-2 | カレンダーを右にフリックすると前月に移動したい |
| US-3 | 矢印ボタンによる月移動は引き続き使えるようにしたい |

---

## 動作仕様

### フリック方向と月移動の対応

| フリック方向 | 動作 |
|------------|------|
| 左フリック（右から左） | 翌月へ移動 |
| 右フリック（左から右） | 前月へ移動 |

### 制約

| 項目 | 仕様 |
|------|------|
| 未来月への制限 | 当月より未来の月への移動は不可（`maxDate` に合わせる） |
| 最小フリック距離 | 50px 以上の水平移動をフリックとして認識 |
| 縦スクロールとの共存 | 縦スクロール中はフリックによる月移動を発動しない |

### 月の移動方法

`react-native-calendars` の `Calendar` コンポーネントは `current` prop で表示月を制御できる。
フリックで `currentMonth` state を更新し、`Calendar` の `current` prop に渡す。

---

## 実装方針

### アプローチ: `PanResponder` による手動ジェスチャー検出

**理由**: `react-native-calendars` の `Calendar` は内部的に `ScrollView` を使用していないため、
`ScrollView` の水平スクロールは適用できない。
React Native 標準の `PanResponder` を使用してスワイプを検出し、月を切り替える。

### `current` prop による表示月制御

```tsx
const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

// フリックで更新
const goToPreviousMonth = () => { /* subMonths */ }
const goToNextMonth = () => { /* addMonths、ただし未来月は不可 */ }

<Calendar current={currentMonth} ... />
```

### 縦スクロールとの共存

`PanResponder.onMoveShouldSetPanResponder` で水平方向の移動量が垂直方向より大きい場合のみフリックとして認識する。

---

## 影響範囲

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `features/calendar/components/MonthCalendar.tsx` | 修正 | `PanResponder` 追加、`current` prop 対応、`onSwipe` prop 追加 |
| `features/calendar/screens/CalendarScreen.tsx` | 修正 | `currentMonth` state 追加、`MonthCalendar` に渡す |
| `features/calendar/components/__tests__/MonthCalendar.component.test.tsx` | 修正 | フリックジェスチャーのテスト追加 |
| `features/calendar/screens/__tests__/CalendarScreen.test.tsx` | 修正 | `currentMonth` state のテスト追加 |

---

## 非機能要件

- フリック検出は既存の日付タップ操作を妨げない
- アニメーションは不要（スムーズな月切り替えは `react-native-calendars` のデフォルト動作に任せる）
- 追加ライブラリなし（`react-native-gesture-handler` は導入済みだが、本機能では PanResponder で十分）

---

## テスト要件

| ID | テストケース |
|----|------------|
| T-1 | 左フリック（dx < -50）で翌月に移動する |
| T-2 | 右フリック（dx > 50）で前月に移動する |
| T-3 | 縦スクロール（dy > dx 絶対値）ではフリックが発動しない |
| T-4 | 当月（今月）で左フリックしても未来月には移動しない |
| T-5 | フリック後も日付タップが正常に動作する |
