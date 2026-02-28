---
name: react-native-testing
description: React Native / Expo アプリのテスト固有パターン集。Alert.alert スパイ、state ちらつき防止、DaySummary 型の子→親コールバックテストなど、RN 特有の落とし穴と解法を提供する。
allowed-tools: Read, Write, Edit, Bash
---

# React Native テストパターン

React Native / Expo 環境でよく遭遇するテスト特有の問題と解法をまとめたリファレンス。

---

## 1. `Alert.alert` のスパイ化とボタン操作テスト

ネイティブの確認ダイアログ (`Alert.alert`) は `beforeEach` でスパイ化し、
ボタン配列を直接取り出して `onPress` を実行することでテストする。

```typescript
import { Alert } from 'react-native';

beforeEach(() => {
  // clearAllMocks でリセットされるため beforeEach で再スパイする
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('削除を確定すると Repository.delete が呼ばれる', async () => {
  fireEvent.press(screen.getByTestId('delete-button'));

  // Alert が正しいタイトル・メッセージで呼ばれたことを確認
  expect(Alert.alert).toHaveBeenCalledWith(
    'ワークアウトを削除',
    'このワークアウトを削除してよろしいですか？',
    expect.any(Array),
  );

  // 第3引数（ボタン配列）から destructive ボタンの onPress を呼ぶ
  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
    text: string;
    style?: string;
    onPress?: () => Promise<void>;
  }>;
  const deleteButton = buttons.find((b) => b.style === 'destructive');
  await act(async () => {
    await deleteButton?.onPress?.();
  });

  expect(mockRepository.delete).toHaveBeenCalledWith('some-id');
});

it('キャンセルを選択すると delete は呼ばれない', async () => {
  fireEvent.press(screen.getByTestId('delete-button'));
  expect(Alert.alert).toHaveBeenCalled();
  // キャンセルボタンの onPress を呼ばなければ delete は実行されない
  expect(mockRepository.delete).not.toHaveBeenCalled();
});
```

### なぜカスタム Modal ではなく Alert.alert を使うか

`flexDirection: 'row'` を含むカスタム Modal は iOS でレイアウトが不安定になり、
ボタンが正しく描画されないケースがある（#153 実例）。
確認ダイアログには `Alert.alert`（OS ネイティブ）を優先する。

---

## 2. 子→親コールバックを介した state のテスト

子コンポーネントをモックし、`onXxx` コールバックを外部変数経由で手動実行するパターン。
`DaySummary` の `onWorkoutFound` コールバックが典型例。

```typescript
// DaySummary をモックして onWorkoutFound を外部から呼べるようにする
let mockDaySummaryCapturedProps: Record<string, unknown> = {};
jest.mock('../../components/DaySummary', () => ({
  DaySummary: (props: Record<string, unknown>) => {
    // 毎回最新 props を外部変数に保存し、テストから直接コールバックを呼ぶ
    mockDaySummaryCapturedProps = props;
    return null;
  },
}));

// テスト内: ヘルパーでコールバックをシミュレート
async function simulateWorkoutFound(workoutId: string) {
  await waitFor(() => {
    expect(mockDaySummaryCapturedProps['onWorkoutFound']).toBeDefined();
  });
  const onWorkoutFound = mockDaySummaryCapturedProps['onWorkoutFound'] as (
    id: string | null,
  ) => void;
  // act() でラップして React の state 更新を正しく処理させる
  await act(async () => {
    onWorkoutFound(workoutId);
  });
  // 副作用（削除ボタン表示など）の完了を待つ
  await waitFor(() => {
    expect(screen.getByTestId('delete-workout-button')).toBeTruthy();
  });
}
```

**注意**: `beforeEach` で `mockDaySummaryCapturedProps = {}` にリセットすること。
リセット漏れがあると前テストの props を参照し、テスト間で干渉する。

---

## 3. ちらつき防止 state パターンのテスト

「子がロードするまで親 UI を隠す」パターン（`daySummaryLoaded` など）をテストする場合、
コールバック実行後に `waitFor` で UI 要素の出現を待つ。

```typescript
it('DaySummary ロード前はボタンが非表示になる', async () => {
  render(<CalendarScreen />);

  // DaySummary がロード完了を通知する前はボタンが存在しない
  expect(screen.queryByTestId('record-or-edit-button')).toBeNull();
});

it('DaySummary ロード完了後にボタンが表示される', async () => {
  render(<CalendarScreen />);

  // onWorkoutFound を呼んで「ロード完了」をシミュレート
  await act(async () => {
    const onWorkoutFound = mockDaySummaryCapturedProps['onWorkoutFound'] as (
      id: string | null,
    ) => void;
    onWorkoutFound(null); // ワークアウトなし日でも daySummaryLoaded が true になる
  });

  await waitFor(() => {
    expect(screen.getByTestId('record-or-edit-button')).toBeTruthy();
  });
});
```

### ちらつきの2つの根本原因

| 原因 | 解法 |
|------|------|
| コールバックがデータ取得完了前に呼ばれる | `finally` ブロックで `onCallback` と `setLoading(false)` を同時実行（React 18 自動バッチング） |
| 親の UI 要素が子のロード完了前に描画される | 親に `loadedFlag` state を持ち、子のコールバックで解除するまで UI を非表示にする |

```typescript
// DaySummary（子）: finally バッチ更新
let foundWorkoutId: string | null = null;
try {
  // ... 全データ取得 ...
  foundWorkoutId = w.id;
} finally {
  // onWorkoutFound と setLoading を同一バッチで処理してちらつきを防ぐ
  onWorkoutFound?.(foundWorkoutId);
  setLoading(false);
}

// CalendarScreen（親）: ロード完了フラグで UI をガード
const [daySummaryLoaded, setDaySummaryLoaded] = useState(false);

const handleWorkoutFound = useCallback((workoutId: string | null) => {
  setCurrentWorkoutId(workoutId);
  setDaySummaryLoaded(true); // ← フラグを立てて UI 表示を解放
}, []);

// 日付変更時はリセット
const handleDayPress = useCallback((dateString: string) => {
  setSelectedDate(dateString);
  setCurrentWorkoutId(null);
  setDaySummaryLoaded(false); // ← リセット
}, []);

// フラグが立つまで CTA ボタンを非表示
{!isFutureDate && daySummaryLoaded && <ActionButton />}
```

---

## 5. useState リスト + DB 更新：明示的再取得が必要

`useState` で管理されたリスト（例: `allExercises`）は、DB を更新しても UI に自動反映されない。
更新処理の末尾で必ず再取得関数を呼ぶこと（Issue #186 実例: お気に入りトグル後に反映されなかったバグ）。

```typescript
// NG: DB だけ更新、state が古いまま → UI に反映されない
const handleToggleFavorite = useCallback(async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
}, []);

// OK: DB 更新 → 再取得で state を最新化
const handleToggleFavorite = useCallback(async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
  await loadExercises(); // ← 明示的に再取得
}, [loadExercises]);
```

**テストで検証する観点**

```typescript
it('お気に入り登録後にリスト再取得が呼ばれる', async () => {
  render(<ExercisePickerScreen />);
  fireEvent.press(screen.getByTestId('favorite-button-exercise-1'));
  await waitFor(() => {
    expect(mockLoadExercises).toHaveBeenCalledTimes(1);
  });
});
```

**楽観的更新との使い分け**:
- `loadExercises()` 再取得: 実装シンプル。ネットワーク遅延がない SQLite では体感差なし
- 楽観的更新（state を先に変更 → DB 更新 → 失敗時ロールバック）: サーバー通信がある場合に有効

---

## 6. モックされた prop コールバックが state 更新を伴う場合は `act()` でラップする

モックコンポーネントの prop（`onDayPress` など）を直接呼び出すとき、
そのハンドラーの内部で `setState` / `useState setter` が**同期で**呼ばれる場合は
`act()` でラップしないと "not wrapped in act(...)" 警告が出る。

```typescript
// NG: モック prop を直接呼ぶ（ハンドラーが setIsAnimating など state を更新する場合）
const centerCalendar = mockCalendarInstances[1];
centerCalendar!.onDayPress({ dateString: '2026-01-28' });
// → Warning: An update to MonthCalendar inside a test was not wrapped in act(...)

// OK: act() でラップする
act(() => {
  centerCalendar!.onDayPress({ dateString: '2026-01-28' });
});

// 非同期アニメーション完了を待つ場合はさらに runAllTimers() も act() 内で
act(() => {
  jest.runAllTimers();
});

await waitFor(() => {
  expect(screen.getByText('2026年1月')).toBeTruthy();
});
```

**判断基準**: モック prop ハンドラーの中で `setState` 系が呼ばれる可能性があれば `act()` 必須。
以前は直接呼んでいたテストも、実装変更でハンドラーに `setState` が追加されると警告が出始める。

---

## 6b. 外部コントロール可能な Promise を resolve した後も `act()` でラップ必須

テスト内で「pending Promise を後から resolve する」パターン（`resolveChat` / `resolveQuery` 等）では、
`resolve()` の呼び出しを `await act(async () => {})` でラップしないと
**ローカルは通過・CI でのみ失敗**するタイミング依存バグが生じる。

```typescript
// セットアップ: テスト内で resolve をコントロールできる Promise を用意
let resolveChat!: (v: { content: string }) => void;
mockChat.mockReturnValueOnce(
  new Promise<{ content: string }>((resolve) => { resolveChat = resolve; }),
);
render(<AIScreen />);

// NG: act() の外から resolve → ローカル OK・CI でタイムアウト
resolveChat({ content: '応答' });
await waitFor(() => {
  expect(screen.queryByTestId('typing-indicator')).toBeNull();
  // CI: waitFor が polling する前に isLoading=false が反映されず タイムアウト
});

// OK: act(async () => {}) でラップ → 環境非依存で確実に動く
await act(async () => {
  resolveChat({ content: '応答' });
});
expect(screen.queryByTestId('typing-indicator')).toBeNull();
```

**なぜ CI だけ落ちるのか**:
`act(async () => {})` は「Promise チェーン完了 → React state flush → 再レンダー完了」
まで同期的に待つ。`waitFor` の polling は最大 1000ms だが、CI（Linux、低スペック）では
microtask + state flush が polling 間隔に収まらないことがある。
`act()` を使えば環境に関係なく状態が確定してから assertion できる。

**適用タイミング**:
- `mockFn.mockReturnValueOnce(new Promise(...))` で pending Promise をセットしたとき
- `resolve()` / `reject()` を呼んだ直後に DOM 変化を検証するとき

**⚠️ `await act(async () => {})` をフラッシュ目的で使うのは NG**:

「状態更新を待つために `act()` を挿入する」テクニックは、コンポーネントが
`setInterval` / `Animated.loop` / SQLite 非同期などの **active timers** を持つ場合にハングする。
`act()` は「すべての pending async work が完了するまで」待つため、
終わらないタイマーがあるとテストが 5000ms タイムアウトで落ちる。

```typescript
// ❌ NG: active timers を持つコンポーネントで使うとテストがハング（5000ms タイムアウト）
render(<HomeScreen />);
await screen.findByText('今月のトレーニング');
await act(async () => {});  // ← HomeScreen の SQLite 非同期が残っていてハング
expect(screen.queryByTestId('recording-banner')).toBeNull();

// ✅ OK: waitFor をそのまま使う
render(<HomeScreen />);
await screen.findByText('今月のトレーニング');
await waitFor(() => {
  expect(screen.queryByTestId('recording-banner')).toBeNull();
});
```

**`act()` をフラッシュ目的に使えるのは**、手動で resolve できる Promise のみを持つ
シンプルなモックコンポーネント（AIScreen の `resolveChat` パターン）に限る。
「toBeNull() が CI でタイムアウトする」場合はまず実装側の条件漏れを疑うこと。

---

## 7. ScrollView pagingEnabled + ユーザー操作ガードのスワイプテスト

`onScrollBeginDrag` で `isUserDraggingRef = true` をセットして
「プログラム的な scrollTo」と「ユーザースワイプ」を区別するガードがある場合、
スワイプをテストするときは必ず `scrollBeginDrag` → `momentumScrollEnd` の順で発火する。

```typescript
// NG: momentumScrollEnd だけ発火 → ガードに弾かれて月が変わらない
fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
  nativeEvent: { contentOffset: { x: 0 } },
});
// → isUserDraggingRef.current が false のため何も起きない

// OK: スワイプ開始を先に発火してからスワイプ終了を発火
fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
  nativeEvent: { contentOffset: { x: 0 } },
});
act(() => {
  jest.runAllTimers(); // resetToCenter の setTimeout(0) を消化
});
await waitFor(() => {
  expect(screen.getByText('2026年1月')).toBeTruthy();
});
```

**適用条件**: `onScrollBeginDrag` + `isUserDraggingRef` のガードパターンが実装されている ScrollView。
`pagingEnabled` の 3パネル方式（前月・当月・翌月）カレンダーで採用している。

---

## 4. マルチエージェント並行実行時の競合に注意

複数エージェントが同一ファイルを並行編集すると変更が上書きされる。
特に色・定数・スタイル値は「以前の状態に戻す」コミットが他エージェントの作業として
誤って実行されやすい（#162 実例：`#E6F2FF` → `#93C5FD` への意図しない戻り）。

**対策**:
- スタイル定数の変更は「作業完了 → コミット → push」後に他エージェントを起動する
- エージェントに「このファイルの X 行を変更した後、必ず git add して確認する」と明示する
- 変更後に `grep` でターゲット値が正しく書き込まれているか確認してからコミットする

---

## React Navigation テストパターン

### `useFocusEffect` を使う画面のモック

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

#### 【応用】コールバックを実際に実行しつつ呼び出しを検証する

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

### `useFocusEffect` + `useRef` 初期化制御パターン

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

### jest.mock() factory でのモック変数参照：クロージャでラップする

`jest.mock()` は Babel によってファイル先頭にホイストされるため、
factory 関数の実行時点ではモジュールレベルの変数がまだ初期化されていない。

#### NG: factory 内でモック変数を直接代入する

```typescript
const mockUseExerciseSearch = jest.fn(); // ← factory 実行時はまだ undefined

jest.mock('../../hooks/useExerciseSearch', () => ({
  useExerciseSearch: mockUseExerciseSearch, // ← undefined が代入される
}));
// → TypeError: useExerciseSearch is not a function
```

#### OK: クロージャでラップして評価を遅延させる

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

直接代入（`key: mockVar`）だけが NG で、関数内での参照（`key: () => mockVar`）は OK。

### RNGH コンポーネント追加時は mock を必ず更新する

`react-native-gesture-handler` から新しいコンポーネント（`TouchableOpacity`、`Gesture.Tap` 等）を
追加するたびに、テストの mock にも同じコンポーネントを追加する必要がある。
追加しないとテスト実行時に `undefined` が返りクラッシュするか、ボタン押下が検知されない。

```typescript
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  // RNGH コンポーネントを追加するたびここにも追加する
  // react-native の実装にフォールバックさせることで fireEvent.press が動く
  TouchableOpacity: require('react-native').TouchableOpacity,
}));
```

**追加が必要なタイミング**:
- 実装ファイルの import に RNGH コンポーネントが増えたとき
- `fireEvent.press` でボタンが検知されなくなったとき（mock から漏れているサイン）

**実績**: ExerciseReorderModal（Issue #189）でヘッダーボタンを RNGH `TouchableOpacity` に変更した際に追記。

### Zustand `getState()` で stale closure を回避

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
