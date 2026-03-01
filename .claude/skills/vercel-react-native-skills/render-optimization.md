# React レンダー最適化パターン

vercel-react-native-skills スキルの参照ファイル（A案: パフォーマンス問題・遅延調査時に Read）。
日付タップ→サマリー表示の遅延調査（2026-02-26）で確立したパターン。

---

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
