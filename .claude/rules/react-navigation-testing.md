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

### 【応用】コールバックを実際に実行しつつ呼び出しを検証する

副作用（データ取得など）の動作もテストしたい場合は、wrapper パターンを使う。

```typescript
const mockUseFocusEffect = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    useNavigation: jest.fn().mockReturnValue({ navigate: jest.fn() }),
    useRoute: jest.fn(() => ({ params: mockRouteParams })),
    useFocusEffect: (cb: () => void) => {
      mockUseFocusEffect(cb); // 呼び出しをキャプチャ
      useEffect(cb, [cb]);    // コールバックを実際に実行
    },
  };
});
```

**⚠️ アサーションは必ず `mockUseFocusEffect` を使う**

```typescript
expect(mockUseFocusEffect).toHaveBeenCalled(); // ✅

// import した useFocusEffect に .toHaveBeenCalled() を使うと必ず失敗する
// expect(useFocusEffect).toHaveBeenCalled();
// → "received value must be a mock or spy function"
// wrapper 関数は jest.fn() ではないため spy メソッドが使えない
```

**⚠️ wrapper パターンに変えたら import も整理する**

```typescript
// useFocusEffect を import から削除しないと lint エラー（no-unused-vars）
// import { useFocusEffect, useRoute } from '@react-navigation/native'; // ❌
import { useRoute } from '@react-navigation/native';                     // ✅
```

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

## jest.mock() factory でのモック変数参照：クロージャでラップする

`jest.mock()` は Babel によってファイル先頭にホイストされるため、
factory 関数の実行時点ではモジュールレベルの変数がまだ初期化されていない。

### NG: factory 内でモック変数を直接代入する

```typescript
const mockUseExerciseSearch = jest.fn(); // ← factory 実行時はまだ undefined

jest.mock('../../hooks/useExerciseSearch', () => ({
  useExerciseSearch: mockUseExerciseSearch, // ← undefined が代入される
}));
// → TypeError: useExerciseSearch is not a function
```

### OK: クロージャでラップして評価を遅延させる

```typescript
const mockUseExerciseSearch = jest.fn();

jest.mock('../../hooks/useExerciseSearch', () => ({
  // クロージャにより、テスト実行時（変数初期化後）に評価される
  useExerciseSearch: (...args: unknown[]) => mockUseExerciseSearch(...args),
}));

// beforeEach で返却値を設定してテストごとに制御する
beforeEach(() => {
  mockUseExerciseSearch.mockReturnValue({ query: '', sections: [], ... });
});
```

### なぜ `() => ({ goBack: mockGoBack })` は動くか

`useNavigation: () => ({ goBack: mockGoBack })` はネストした関数の中で `mockGoBack` を参照している。
外側のアロー関数は factory 実行時に作成されるが、`mockGoBack` が評価されるのは
コンポーネントが `useNavigation()` を呼ぶ時点（テスト実行中）。
変数が初期化された後なので問題ない。

直接代入（`key: mockVar`）だけが NG で、関数内での参照（`key: () => mockVar`）は OK。

---

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
