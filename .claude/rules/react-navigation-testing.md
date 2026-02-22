# React Navigation のテストパターン

## `useFocusEffect` を使う画面のモック

`useFocusEffect` を使っている画面をテストするとき、`@react-navigation/native` のモックに
`useFocusEffect: jest.fn()` を必ず含める。含め忘れると `TypeError: useFocusEffect is not a function` で即クラッシュする。

```typescript
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  // useFocusEffect はテスト環境では no-op にする
  // （実際の遷移コンテキストが不要なため）
  useFocusEffect: jest.fn(),
}));
```

**no-op で良い理由**: テストは画面の描画結果を検証する。
`useFocusEffect` を no-op にすると「フォーカス時の副作用」は動かないが、
これらはほとんどのケースで別途モック済みのフック（`useWorkoutSession` 等）が担うため問題ない。

## `useFocusEffect` + `useRef` 初期化制御パターン

タブナビゲーター配下の画面では `useEffect(fn, [])` の代わりに `useFocusEffect` を使う。
理由: タブ画面はマウント済みのまま残るため、別タブから戻っても `useEffect([])` は再実行されない。
`useFocusEffect` なら画面がフォーカスを得るたびに呼ばれる。

ただし「初回フォーカスだけ実行したい」処理は `useRef` で制御する：

```typescript
const sessionInitializedRef = useRef(false);

useFocusEffect(
  useCallback(() => {
    // Zustand store の最新値を直接取得（クロージャの陳腐化を防ぐ）
    const storeState = useWorkoutSessionStore.getState();
    const pendingId = storeState.pendingContinuationWorkoutId;

    if (pendingId !== null) {
      // 継続モード: pendingId があれば毎回フォーカス時に実行
      storeState.setPendingContinuationWorkoutId(null);
      void session.startSession(pendingId);
    } else if (!sessionInitializedRef.current) {
      // 初回フォーカスのみ実行（再フォーカスでは起動しない）
      sessionInitializedRef.current = true;
      void session.startSession();
    }
  }, [session]),
);
```

## Zustand `getState()` で stale closure を回避

`useFocusEffect` / `useEffect` 内で Zustand の最新値が必要な場合、
フックの戻り値（`const { x } = useStore()`）はクロージャに捕捉された古い値になりうる。
代わりに静的メソッド `useStore.getState()` を使うとコールバック実行時の最新値を取得できる：

```typescript
// NG: クロージャが古い値を参照する可能性がある
const pendingId = store.pendingContinuationWorkoutId;
useFocusEffect(useCallback(() => {
  if (pendingId !== null) { ... } // pendingId が陳腐化する
}, []));

// OK: getState() で実行時の最新値を取得
useFocusEffect(useCallback(() => {
  const state = useWorkoutSessionStore.getState();
  if (state.pendingContinuationWorkoutId !== null) { ... }
}, []));
```
