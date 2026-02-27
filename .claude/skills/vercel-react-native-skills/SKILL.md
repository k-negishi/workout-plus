---
name: vercel-react-native-skills
description:
  React Native and Expo best practices for building performant mobile apps. Use
  when building React Native components, optimizing list performance,
  implementing animations, or working with native modules. Triggers on tasks
  involving React Native, Expo, mobile performance, or native platform APIs.
allowed-tools: Read, Write, Edit, Bash
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React Native Skills

Comprehensive best practices for React Native and Expo applications. Contains
rules across multiple categories covering performance, animations, UI patterns,
and platform-specific optimizations.

## When to Apply

Reference these guidelines when:

- Building React Native or Expo apps
- Optimizing list and scroll performance
- Implementing animations with Reanimated
- Working with images and media
- Configuring native modules or fonts
- Structuring monorepo projects with native dependencies

## Rule Categories by Priority

| Priority | Category         | Impact   | Prefix               |
| -------- | ---------------- | -------- | -------------------- |
| 1        | List Performance | CRITICAL | `list-performance-`  |
| 2        | Animation        | HIGH     | `animation-`         |
| 3        | Navigation       | HIGH     | `navigation-`        |
| 4        | UI Patterns      | HIGH     | `ui-`                |
| 5        | State Management | MEDIUM   | `react-state-`       |
| 6        | Rendering        | MEDIUM   | `rendering-`         |
| 7        | Monorepo         | MEDIUM   | `monorepo-`          |
| 8        | Configuration    | LOW      | `fonts-`, `imports-` |

## Quick Reference

### 1. List Performance (CRITICAL)

- `list-performance-virtualize` - Use FlashList for large lists
- `list-performance-item-memo` - Memoize list item components
- `list-performance-callbacks` - Stabilize callback references
- `list-performance-inline-objects` - Avoid inline style objects
- `list-performance-function-references` - Extract functions outside render
- `list-performance-images` - Optimize images in lists
- `list-performance-item-expensive` - Move expensive work outside items
- `list-performance-item-types` - Use item types for heterogeneous lists

### 2. Animation (HIGH)

- `animation-gpu-properties` - Animate only transform and opacity
- `animation-derived-value` - Use useDerivedValue for computed animations
- `animation-gesture-detector-press` - Use Gesture.Tap instead of Pressable

### 3. Navigation (HIGH)

- `navigation-native-navigators` - Use native stack and native tabs over JS navigators

### 4. UI Patterns (HIGH)

- `ui-expo-image` - Use expo-image for all images
- `ui-image-gallery` - Use Galeria for image lightboxes
- `ui-pressable` - Use Pressable over TouchableOpacity
- `ui-safe-area-scroll` - Handle safe areas in ScrollViews
- `ui-scrollview-content-inset` - Use contentInset for headers
- `ui-menus` - Use native context menus
- `ui-native-modals` - Use native modals when possible
- `ui-measure-views` - Use onLayout, not measure()
- `ui-styling` - Use StyleSheet.create or Nativewind

### 5. State Management (MEDIUM)

- `react-state-minimize` - Minimize state subscriptions
- `react-state-dispatcher` - Use dispatcher pattern for callbacks
- `react-state-fallback` - Show fallback on first render
- `react-compiler-destructure-functions` - Destructure for React Compiler
- `react-compiler-reanimated-shared-values` - Handle shared values with compiler

### 6. Rendering (MEDIUM)

- `rendering-text-in-text-component` - Wrap text in Text components
- `rendering-no-falsy-and` - Avoid falsy && for conditional rendering

### 7. Monorepo (MEDIUM)

- `monorepo-native-deps-in-app` - Keep native dependencies in app package
- `monorepo-single-dependency-versions` - Use single versions across packages

### 8. Configuration (LOW)

- `fonts-config-plugin` - Use config plugins for custom fonts
- `imports-design-system-folder` - Organize design system imports
- `js-hoist-intl` - Hoist Intl object creation

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/list-performance-virtualize.md
rules/animation-gpu-properties.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

### 9. React レンダー最適化 (HIGH)

日付タップ→サマリー表示の遅延調査（2026-02-26）で確立したパターン。

#### `useMemo` 依存配列の参照安定化

毎レンダーで新しい値を生成する式を `useMemo` の依存配列に入れると、memo が毎回無効化される。

```typescript
// NG: format() が毎レンダーで新しい文字列を生成 → markedDates が毎回再計算
const today = format(new Date(), 'yyyy-MM-dd');
const markedDates = useMemo(() => { ... }, [trainingDates, selectedDate, today]);

// OK: today 自体を useMemo で安定化
const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
const markedDates = useMemo(() => { ... }, [trainingDates, selectedDate, today]);
```

#### `React.memo` と `useMemo` の連携

`React.memo` でコンポーネントをラップしても、内部の `useMemo` が壊れていると子コンポーネント（`react-native-calendars` の Calendar 等）の再レンダーは防げない。

**手順**: useMemo の依存配列を先に安定化 → その後に React.memo をかける。逆順だと効果が出ない。

#### `key={prop}` リマウントの代替: レンダー中の同期 setState

`key={prop}` はコンポーネントの完全な破棄→再生成を引き起こす。旧データのちらつき防止が目的なら、`useRef` + レンダー中 setState で代替できる。

```typescript
// NG: key でリマウント（DOM 破棄→再生成、エフェクト再実行のコストが高い）
<DaySummary key={selectedDate} dateString={selectedDate} />

// OK: useRef で前回値を追跡し、変わっていれば同期的にクリア
const prevDateRef = useRef(dateString);
if (prevDateRef.current !== dateString) {
  prevDateRef.current = dateString;
  setLoading(true);
  setData(null);
}
```

React のレンダー中 setState は合法（再レンダーをトリガー）で、`useEffect` を待たずに即座にデータクリアできる。

#### イベントハンドラ内の同フレーム読み取りフラグは `useRef` で持つ

`useState` の更新は非同期（次レンダーで反映）。
「フラグを立てた直後に別のイベントハンドラが同フレームで読む」場面では `useRef` を使う。

典型例: `scrollTo(animated: true)` を呼んだ直後に `onMomentumScrollEnd` が発火するケース。

```typescript
// NG: setIsAnimating(true) は次 render まで反映されない
//     → scrollTo() 後の onMomentumScrollEnd が stale な false を読んで二重発火する
const [isAnimating, setIsAnimating] = useState(false);

const handlePress = () => {
  setIsAnimating(true);              // まだ反映されていない
  scrollViewRef.current?.scrollTo({ x: 0, animated: true });
};

const handleMomentumScrollEnd = () => {
  if (isAnimating) return;           // stale false → ガードが効かない
  // ... 処理が二重に走る
};

// OK: useRef は current への代入が即座に反映される
const isAnimatingRef = useRef(false);

const handlePress = () => {
  isAnimatingRef.current = true;     // 即座に反映
  scrollViewRef.current?.scrollTo({ x: 0, animated: true });
};

const handleMomentumScrollEnd = () => {
  if (isAnimatingRef.current) return; // 正しくガードできる
};
```

**判断基準**: フラグが「UI の表示制御」に使われるなら `useState`、
「同フレーム内の処理ガード（命令的ロジック）」に使われるなら `useRef`。

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

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
