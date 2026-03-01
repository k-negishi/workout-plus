# ScrollView パターン

vercel-react-native-skills スキルの参照ファイル（A案: ScrollView 実装・高さ変動問題時に Read）。

---

### 10. ScrollView ラチェット minHeight パターン (HIGH)

動的コンテンツ（月ごとに行数が変わるカレンダー等）を内包する ScrollView では、
コンテンツ変更のたびに高さが変動し、直下コンポーネントの位置がブレる。

#### 問題

横スワイプ用の `pagingEnabled` ScrollView は、内包する最大パネルの高さで自身の高さを決定する。
パネルの中身が動的に変わると、高さが縮んで直下のコンポーネントがジャンプする。

典型例: 3パネル構成のカレンダー ScrollView で、月切替により中身が5行→6行に変化するケース。

#### 解決: ラチェット方式（最大高のみ保持、縮小しない）

```typescript
// 計測した最大高を useRef で保持し、minHeight に反映する
// 「ラチェット」= 一度上がった高さは絶対に下がらない
const maxScrollHeightRef = useRef(0);
const [scrollMinHeight, setScrollMinHeight] = useState(0);

const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
  const { height } = event.nativeEvent.layout;
  if (height > maxScrollHeightRef.current) {
    maxScrollHeightRef.current = height;
    setScrollMinHeight(height);
  }
}, []);

<ScrollView
  horizontal
  pagingEnabled
  onLayout={handleScrollViewLayout}
  style={scrollMinHeight > 0 ? { minHeight: scrollMinHeight } : undefined}
>
  {panels}
</ScrollView>
```

**なぜ `useRef` + `useState` の二重管理か**:
- `useRef`: 比較判定用（同期的に最大値を更新）
- `useState`: `minHeight` スタイルへの反映用（再レンダーをトリガー）
- `useRef` だけだと再レンダーが起きず、`useState` だけだと比較時に stale な値を読む可能性がある

**「10. onLayout フラッシュ防止」との違い**: フラッシュ防止は「初期値→実測値のズレを防ぐ」問題。
ラチェット minHeight は「動的コンテンツによる高さ変動を吸収する」問題。併用可能。

**実績**: MonthCalendar.tsx（#170）で適用。月切替時のサマリー位置ジャンプを完全解消。
