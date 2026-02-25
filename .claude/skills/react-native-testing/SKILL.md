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

## 4. マルチエージェント並行実行時の競合に注意

複数エージェントが同一ファイルを並行編集すると変更が上書きされる。
特に色・定数・スタイル値は「以前の状態に戻す」コミットが他エージェントの作業として
誤って実行されやすい（#162 実例：`#E6F2FF` → `#93C5FD` への意図しない戻り）。

**対策**:
- スタイル定数の変更は「作業完了 → コミット → push」後に他エージェントを起動する
- エージェントに「このファイルの X 行を変更した後、必ず git add して確認する」と明示する
- 変更後に `grep` でターゲット値が正しく書き込まれているか確認してからコミットする
