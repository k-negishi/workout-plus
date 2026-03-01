# 副作用管理ルール

coding-rules スキルの参照ファイル（A案: 副作用・非同期処理・DB 同期実装時に Read）。

---

## 3. 副作用の管理

### 基本方針

- **ビジネスロジックは純粋関数で書く**（同じ入力 → 必ず同じ出力）
- 副作用（API 通信・ストレージ・タイマー）は**境界に閉じ込める**
- コンポーネントに副作用ロジックを直書きしない

### 純粋関数を優先する

```typescript
// NG: 関数内でグローバル状態を書き換える（副作用）
function addSet(exercise: Exercise): void {
  exercise.sets.push({ weight: 0, reps: 0 }); // 引数を直接変更している
}

// OK: 入力を変更せず新しい値を返す（純粋関数）
function addSet(exercise: Exercise): Exercise {
  return {
    ...exercise,
    sets: [...exercise.sets, { weight: 0, reps: 0 }],
  };
}
```

### 副作用は useEffect・カスタムフック・サービス層に閉じ込める

```typescript
// NG: コンポーネント本体に副作用を直書き
const WorkoutScreen: React.FC = () => {
  AsyncStorage.setItem('session', JSON.stringify(session)); // レンダー中に副作用
  // ...
};

// OK: useEffect で副作用を明示的に管理
const WorkoutScreen: React.FC = () => {
  useEffect(() => {
    // セッション変更時のみ保存（依存配列で制御）
    AsyncStorage.setItem('session', JSON.stringify(session));
  }, [session]);
  // ...
};

// より良い: カスタムフックに副作用を隠蔽
const { saveSession } = useWorkoutSession();
```

### カスタムフックで副作用を集約する

```typescript
/**
 * ワークアウトセッションの永続化を担当するフック。
 * コンポーネントは保存の詳細を知らなくてよい。
 */
function useWorkoutSession(sessionId: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);

  // 読み込み（副作用）
  useEffect(() => {
    WorkoutRepository.findById(sessionId).then(setSession);
  }, [sessionId]);

  // 書き込み（副作用を関数に閉じ込める）
  const saveSession = useCallback(async (data: WorkoutSession) => {
    await WorkoutRepository.save(data);
    setSession(data);
  }, []);

  return { session, saveSession };
}
```

### DB 変更後は必ず UI を同期する

Repository の write 系メソッド（create / update / delete / toggle 等）を呼んだ後は、
必ず表示データを更新する。しないと UI が DB と乖離した古い状態を表示し続ける。

```typescript
// NG: DB を変更したが UI を更新しない → 画面が古い状態のまま
const handleToggleFavorite = async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
  // ← 何もしないと一覧の表示が変わらない
};

// OK パターン A: 再取得（DB の最新状態を信頼する）
const handleToggleFavorite = async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
  await loadExercises(); // ← DB から最新リストを再取得して state に反映
};

// OK パターン B: 楽観的更新（レスポンシブな UX が必要な場合）
const handleToggleFavorite = async (id: string) => {
  setExercises((prev) =>
    prev.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)),
  );
  try {
    await ExerciseRepository.toggleFavorite(id);
  } catch {
    await loadExercises(); // 失敗時は再取得でロールバック
  }
};
```

**使い分け**:
- 単純な CRUD → パターン A（再取得）で十分。実装がシンプル
- タップ → 即座に反応が必要な UX → パターン B（楽観的更新）

### useEffect deps と `ref.current`: ESLint `exhaustive-deps` 回避

`react-hooks/exhaustive-deps` の警告を `// eslint-disable-next-line` で抑制しようとすると罠がある。
警告は `useEffect(() => {` 行ではなく**コールバック内部の参照行**に出るため、
フックの直前に disable コメントを置いても「Unused eslint-disable directive」エラーになる。

```typescript
// NG: disable コメントをフックの直前に置いても効かない
// eslint-disable-next-line react-hooks/exhaustive-deps  ← "Unused directive" になる
useEffect(() => {
  if (isSameMonth(displayMonth, newMonth)) return;  // ← ここで警告が出る（この行が問題）
  setDisplayMonth(newMonth);
}, [selectedDate]);

// OK: deps に含めたくない値は useRef 経由で読む
const displayMonthRef = useRef(displayMonth);
displayMonthRef.current = displayMonth; // 毎レンダー最新値に更新

useEffect(() => {
  const newMonth = startOfMonth(parseISO(selectedDate));
  if (isSameMonth(displayMonthRef.current, newMonth)) return; // ref は deps 不要
  setDisplayMonth(newMonth);
}, [selectedDate]); // displayMonthRef は省略可（ref は安定した参照）
```

**なぜ `ref.current` が有効か**:
- `useRef` は常に同一オブジェクトを返すため ESLint の deps チェック対象外
- `displayMonthRef.current` で最新値を参照できる（stale closure を避けられる）
- `displayMonth` を deps に含めると setter → state 変化 → effect 再実行の**無限ループ**になりうる

**適用条件**: 「外部 props の変化を内部 state に同期したいが、比較に使う内部 state 自体は deps に含めたくない」場合。Issue #204（CalendarScreen の displayMonth 同期）が典型例。

---

### サービス層でネットワーク・ストレージの副作用を分離する

```
src/
  services/
    workout-repository.ts   # DB・AsyncStorage アクセス（副作用を集約）
    api-client.ts           # ネットワーク通信（副作用を集約）
  utils/
    workout-calculator.ts   # 純粋関数のみ（副作用なし）
  hooks/
    use-workout-session.ts  # 副作用とコンポーネントの橋渡し
```
