# 実装計画: UX バグ修正 & 改善バッチ

## アーキテクチャ方針

### 変更対象ファイル

| ファイル | 対応 Issue | 変更内容 |
|---|---|---|
| `apps/mobile/src/features/workout/hooks/useTimer.ts` | #149, #150 | interval の deps 依存バグ修正・discarded 後の再開防止 |
| `apps/mobile/src/features/workout/hooks/__tests__/useTimer.test.ts` | #149, #150 | 速度・discarded テスト追加（既存テストファイルに追記） |
| `apps/mobile/src/features/workout/components/SetRow.tsx` | #146 | kg/rep のプレースホルダー削除・ちらつき解消 |
| `apps/mobile/src/features/workout/components/__tests__/SetRow.test.tsx` | #146 | プレースホルダーなし・ちらつきテスト追加 |
| `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` | #147, #148, #151 | メモ local state 化・削除確認 Alert・種目名カラー変更 |
| `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx` | #147, #148, #151 | 既存テストは実装済み。実装側のみ更新 |
| `apps/mobile/src/features/calendar/screens/CalendarScreen.tsx` | #152, #153 | ローディング中ボタン非表示・削除実装確認 |
| `apps/mobile/src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` | #152, #153 | ちらつき・削除テスト追加 |
| `apps/mobile/src/features/calendar/components/DaySummary.tsx` | #154 | 推定1RMベスト・種目メモ・1日メモ表示（既存実装確認） |
| `apps/mobile/src/features/calendar/components/__tests__/DaySummary.test.tsx` | #154 | 既存テストは実装済み。不足があれば追記 |
| `apps/mobile/src/app/HomeStack.tsx` | #142 | screenOptions にヘッダースタイル統一 |
| `apps/mobile/src/app/CalendarStack.tsx` | #142 | screenOptions にヘッダースタイル統一 |
| `apps/mobile/src/app/__tests__/CalendarStack.test.tsx` | #142 | ヘッダースタイルテスト |

### アーキテクチャ上の判断

#### #149 タイマー速度バグの根本原因

`useTimer.ts` の `useEffect` 依存配列に `elapsedSeconds` が含まれている。
`setInterval` コールバックが `elapsedSeconds + currentElapsed` を計算するとき、
`elapsedSeconds` が更新されるたびに effect が再実行（interval が再生成）される。
結果として 1秒ごとに新しいインターバルが起動し、古いインターバルも並走するため
指数関数的な加速が発生する。

**修正方針**: interval コールバック内では `timerStartedAt` からの差分のみを使い、
`elapsedSeconds` には直接依存しない。`elapsedSeconds` は `deps` から外す。

```typescript
// 修正後のイメージ
useEffect(() => {
  clearTimerInterval();
  if (timerStatus === 'running' && timerStartedAt != null) {
    // startedAt をクロージャにキャプチャして固定する
    const startedAt = timerStartedAt;
    const baseElapsed = useWorkoutSessionStore.getState().elapsedSeconds; // 参照用
    intervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startedAt) / 1000);
      useWorkoutSessionStore.setState({ elapsedSeconds: baseElapsed + diff });
    }, 1000);
  }
  return () => clearTimerInterval();
  // elapsedSeconds を deps から外すことで interval 再生成を防ぐ
}, [timerStatus, timerStartedAt, clearTimerInterval]);
```

#### #150 discarded 後の再開防止

`TimerBar` の再生ボタンは既に `disabled={isTimerDiscarded}` が実装済み。
`useTimer.ts` の `resumeTimer` 内にも guard を追加してストア側でも防ぐ。

#### #146 SetRow プレースホルダー・ちらつき

- kg 入力欄に `placeholder` が設定されていない（正しい状態）
- rep 入力欄に `placeholder="0"` が残っている → 削除
- ちらつきの原因: `FlatList` が `keyExtractor` の key を変えると再マウントが起きる。
  `scrollEnabled={false}` + `FlatList` の組み合わせは問題なし。
  根本は `setNumber` が key として使われているかどうかの確認が必要。
  ExerciseBlock の `FlatList` は `keyExtractor={(item) => item.id}` を使っており問題なし。
  SetRow の `value={set.reps != null ? String(set.reps) : ''}` は `null → ''` の変換で再レンダリングされる可能性がある。
  → TextInput を uncontrolled に近づけるか、`defaultValue` 活用を検討（後述 tasks にて詳細化）

#### #147 メモ入力リセット

`ExerciseBlock` の `TextInput` は `value={memo ?? ''}` として親の prop を直接バインド。
親（RecordScreen）の `onMemoChange` が DB 書き込み後にストアを更新するが、
ストア → props の反映が非同期なため、入力中に値が "" にリセットされる。
**修正**: `ExerciseBlock` 内でローカル `state` を持ち、`onMemoChange` 呼び出し時はローカル state も更新する。

#### #148 削除確認 Alert

`ExerciseBlock` の削除ボタン `onPress` を直接 `onDeleteExercise` → `Alert.alert` にラップする。
`Alert` は React Native 組み込みなので依存追加不要。

#### #151 種目名カラー

`ExerciseBlock` の種目名 `Text` の `color` を `'#334155'` → `'#4D94FF'` に変更するだけ。

#### #152 ちらつき解消

`CalendarScreen` の `{currentWorkoutId && (...削除ボタン)}` パターン。
`handleDayPress` で `setCurrentWorkoutId(null)` している（正しい）が、
`DaySummary` の `onWorkoutFound` が非同期完了後に `setCurrentWorkoutId` を呼ぶため、
日付変更後一瞬 null になり → ローディング完了後に再表示される遷移がある。
これが「前の日付のボタンが一瞬表示される」原因。
**修正**: `loading` フラグを導入し、`DaySummary` がローディング中は削除ボタンを非表示にする。
または `DaySummary` に `isLoading` を渡して親で制御する。

#### #153 カレンダー削除（実装確認）

`CalendarScreen` には既に `handleConfirmDelete` と `ConfirmDialog` が実装されている。
`WorkoutRepository.delete` の存在確認と、テストが不足していれば追加する。

#### #154 DaySummary サマリー強化（実装確認）

`DaySummary` を確認した結果:
- 推定1RMベスト: 各セット行に `1RM: Xkg` は既に表示されている。種目単位のベスト表示は未実装。
  テストファイルに `推定 1RM ベスト: 133kg` の期待値が書かれているが、実装側に表示がない。
- 種目メモ: `ex.memo` が存在する場合に表示 → 実装済み
- 1日メモ (`workout.memo`): 存在する場合に表示 → 実装済み

**要実装**: DaySummary に「推定 1RM ベスト: Xkg」をセット行の下に追加。

#### #142 ヘッダー統一

全スタック (`HomeStack`, `CalendarStack`) は `screenOptions={{ headerShown: false }}` で
ネイティブヘッダーを非表示にしている。
RecordScreen / ExercisePickerScreen / WorkoutSummaryScreen / ExerciseHistoryFullScreen は
それぞれ独自カスタムヘッダーを持つか、ヘッダーなし。
**修正**: 各スタックの `screenOptions` にヘッダー表示 ON + スタイル統一を適用するか、
共通ヘッダーコンポーネントを作成して各画面で使用する。

設計上は「共通 `screenOptions` 方式」を推奨する:
- 理由: 各画面ファイルを変更せず、スタックレベルで一括適用できる
- 懸念: RecordScreen は TimerBar を最上部に配置しているため、
  ネイティブヘッダーを出すとレイアウトが崩れる可能性がある
- 判断: RecordScreen のみ `options={{ headerShown: false }}` で個別上書き

## 実装グループ（並列実行可能）

### Group A: タイマー修正 (#149, #150)
- 対象: `useTimer.ts`, `useTimer.test.ts`
- 他グループとの競合: なし（独立フック）

### Group B: 登録画面 UI 修正 (#146, #147, #148, #151)
- 対象: `SetRow.tsx`, `SetRow.test.tsx`, `ExerciseBlock.tsx`, `ExerciseBlock.test.tsx`
- 他グループとの競合: なし（UI コンポーネントのみ）

### Group C: カレンダー修正 (#152, #153, #154)
- 対象: `CalendarScreen.tsx`, `CalendarScreen.test.tsx`, `DaySummary.tsx`, `DaySummary.test.tsx`
- 他グループとの競合: なし

### Group D: ヘッダー統一 (#142)
- 対象: `HomeStack.tsx`, `CalendarStack.tsx`, 影響を受ける各スクリーン
- 他グループとの競合: RecordScreen を参照（Group A とは独立）

**注意**: Group B 内では `ExerciseBlock.test.tsx` に既に #147/#148/#151 の期待テストが書かれている。
実装（`ExerciseBlock.tsx`）のみ更新すれば Red → Green になる想定。

## リスクと注意事項

### タイマー修正の影響範囲 (#149)
- `useTimer.ts` を修正すると `TimerBar` を通じて `RecordScreen` 全体に影響する
- `useTimer.test.ts` の既存テスト（`Issue #149: インターバルが指数的に速く進まないことの確認`）は
  既にテストが書かれているが、**実装が未修正のため現在 FAIL している**
- 修正後は必ず `pnpm --filter mobile test` で全テスト Pass を確認すること

### ESLint `react-hooks/exhaustive-deps` 警告 (#149)
- `elapsedSeconds` を deps から外すと exhaustive-deps 警告が出る
- `// eslint-disable-next-line react-hooks/exhaustive-deps` コメントと
  その理由コメントを必ず追記すること

### `ExerciseBlock` メモ local state 化 (#147)
- `memo` prop が外部から変更された場合（編集モードでの初期ロードなど）に
  ローカル state と sync が取れなくなる可能性がある
- `useEffect` で `memo` prop の変化を監視し、外部更新時のみ local state を上書きする実装が必要

### ヘッダー統一のデザイン統一 (#142)
- `HomeStack` / `CalendarStack` の各スクリーンはヘッダーを非表示にして
  独自のカスタムヘッダーで実装している画面（RecordScreen, ExercisePicker等）がある
- ネイティブヘッダーを一律 ON にすると各画面のレイアウトに影響する
- 最初に全画面のヘッダー実装状況を調査してから方針を確定すること

### CI チェック
- コミット前に必ず以下を実行すること:
  - `pnpm --filter mobile test`
  - `pnpm lint`
  - `pnpm --filter mobile tsc --noEmit`
  - `pnpm --filter mobile format:check`（Prettier チェック）
