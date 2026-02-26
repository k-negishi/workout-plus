# 実装計画: カレンダー初期表示フラッシュ修正

## 概要

MonthCalendar コンポーネントに `isLayoutMeasured` フラグを追加し、`onLayout` で実測幅が取得されるまでカレンダーを `opacity: 0` で非表示にする。

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `MonthCalendar.tsx` | `isLayoutMeasured` state 追加、`handleLayout` で true 設定、opacity 制御 |
| `MonthCalendar.component.test.tsx` | onLayout イベント発火テスト、opacity 検証テスト追加 |

## 実装詳細

### MonthCalendar.tsx

```typescript
// 新規 state
const [isLayoutMeasured, setIsLayoutMeasured] = useState(false);

// handleLayout を拡張
const handleLayout = useCallback((event: LayoutChangeEvent) => {
  const { width } = event.nativeEvent.layout;
  if (width > 0) {
    setContainerWidth(width);
    setIsLayoutMeasured(true);
  }
}, []);

// View の style に opacity を追加
<View
  onLayout={handleLayout}
  testID="calendar-container"
  style={{ marginBottom: -34, opacity: isLayoutMeasured ? 1 : 0 }}
>
```

### テスト

1. **onLayout 前**: opacity が 0 であること
2. **onLayout 後**: opacity が 1 であること
3. **既存テスト**: 全パス（opacity は要素の存在に影響しない）

## リスク

- なし。`opacity: 0` は要素をツリーに残すため、レイアウト計算に影響しない
- `onLayout` は最初のフレームで発火するため、非表示期間は人間には知覚不能（< 16ms）
