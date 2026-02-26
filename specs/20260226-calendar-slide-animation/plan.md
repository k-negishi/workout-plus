# 実装計画: カレンダー月切替 横スライドアニメーション (#164)

## アーキテクチャ: ScrollView 3 パネル方式

### 構造概要

```
<View onLayout>                       ← コンテナ幅を取得
  <CustomHeader>                      ← 月名 + ← → ボタン（外部）
  <ScrollView
    horizontal
    pagingEnabled
    scrollEnabled={true}
    ref={scrollViewRef}
  >
    <View width={containerWidth}>    ← [0] 前月
      <Calendar hideArrows renderHeader={null} />
    </View>
    <View width={containerWidth}>    ← [1] 現在月（初期表示）
      <Calendar hideArrows renderHeader={null} />
    </View>
    <View width={containerWidth}>    ← [2] 翌月
      <Calendar hideArrows renderHeader={null} />
    </View>
  </ScrollView>
</View>
```

### 状態管理

| State | 型 | 説明 |
|---|---|---|
| `displayMonth` | `Date` | 現在表示中の月（Date オブジェクト） |
| `containerWidth` | `number` | onLayout で取得したコンテナ幅 |
| `isAnimating` | `boolean` | ページ変更処理中フラグ（多重発火防止） |

### 派生値（useMemo）

```typescript
// displayMonth から前後月を計算
const months = useMemo(() => [
  subMonths(displayMonth, 1),  // index 0: 前月
  displayMonth,                 // index 1: 当月
  addMonths(displayMonth, 1),  // index 2: 翌月
], [displayMonth]);
```

### ページ変更フロー

```
ユーザーがスワイプ OR 矢印ボタン押下
  ↓
onMomentumScrollEnd（スワイプ完了）または handleArrowPress
  ↓
targetIndex = 0（前月） or 2（翌月） と判定
  ↓
if isAnimating → 無視
  ↓
setIsAnimating(true)
setDisplayMonth(新しい月)   ← months 配列が再計算される
  ↓
scrollViewRef.current?.scrollTo({ x: containerWidth, animated: false })
  ← 中央（index 1）にリセット（アニメーションなし）
  ↓
setIsAnimating(false)
onMonthChange コールバック（親に通知）
```

### 矢印ボタンの無効化条件

```typescript
const today = startOfMonth(new Date());
const isCurrentMonth = isSameMonth(displayMonth, today);
const isNextMonthDisabled = isAfter(addMonths(displayMonth, 1), today) || isCurrentMonth;
```

### スワイプの翌月ブロック

```typescript
// onMomentumScrollEnd で翌月方向（index 2 へ）スワイプを検出
if (targetIndex === 2 && isNextMonthDisabled) {
  // 中央にリセットするだけで月変更しない
  scrollViewRef.current?.scrollTo({ x: containerWidth, animated: false });
  return;
}
```

## 変更対象ファイル

| ファイル | 変更内容 |
|---|---|
| `MonthCalendar.tsx` | ScrollView 3 パネル方式に全面リライト |
| `MonthCalendar.component.test.tsx` | ScrollView/ヘッダー/月変更のテストに更新 |
| `MonthCalendar.test.ts` | ロジックテストは変更なし（マーカー・未来日判定） |

## 実装順序（TDD）

1. **RED**: ScrollView のモックを含む失敗テストを追加
2. **GREEN**: MonthCalendar.tsx を 3 パネル方式で実装
3. **REFACTOR**: コードのクリーンアップ

## 技術メモ

### ScrollView vs Animated.Value
- `ScrollView pagingEnabled` を採用（仕様書の方針通り）
- `pagingEnabled` により 1 ページ分スクロールで自然にページングされる
- iOS では `UIScrollView` が内部の `TouchableOpacity` と自然に共存
- `Animated.Value` 方式は試したが iOS で TouchableOpacity との競合が発生（Issue #160 教訓）

### onMomentumScrollEnd の信頼性
- ページ変更後に呼ばれる。`scrollEventThrottle` は不要
- `contentOffset.x` を `containerWidth` で割って index を計算する

### Calendar コンポーネント props
- `hideArrows={true}`: 内部矢印を非表示
- `renderHeader={() => null}`: 内部ヘッダーを非表示
- `enableSwipeMonths={false}`: ScrollView がスワイプを担うため無効化
- `current={format(months[i], 'yyyy-MM-dd')}`: 各パネルの表示月を指定
