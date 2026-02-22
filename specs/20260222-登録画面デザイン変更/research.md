# Research: 登録画面デザイン変更

**Branch**: `20260222-登録画面デザイン変更` | **Date**: 2026-02-22

## 調査結果サマリー

### 1. 前回記録の表示アーキテクチャ

**決定**: 前回記録表示を2段階から1段階に統合する

**根拠**:
- 現状: SetRow（行ごと）+ ExerciseBlock ヘッダー（バッジ）の二重表示
- 変更後: ExerciseBlock ヘッダーバッジのみ（コピーボタン付き）

**対象ファイル**:
- `src/features/workout/components/SetRow.tsx` L79-88: インライン前回記録表示（削除対象）
- `src/features/workout/components/ExerciseBlock.tsx` L118-127: ヘッダーバッジ（コピーボタン追加）
- `src/features/workout/screens/RecordScreen.tsx` L241-244: `handleCopyAllPrevious`（現状スタブ → 実装済みに）

**代替案**: 各行に前回記録を残しつつバッジを削除する案もあったが、バッジ+コピーボタンの方がワイヤーフレームの意図に合う

---

### 2. 一括コピー実装アーキテクチャ

**決定**: `ExerciseBlockWithPrevious` 内でコピーロジックを完結させる

**根拠**:
- `previousRecord` は `usePreviousRecord` フック（ExerciseBlockWithPrevious スコープ）が保持
- RecordScreen に `previousRecord` を持ち上げると State のリフトアップが必要で複雑化する
- `onCopyPreviousSet(setId, PreviousSetData)` を RecordScreen から受け取り、ExerciseBlockWithPrevious が全セット分ループして呼ぶ設計が最もシンプル

**実装パターン**:
```typescript
// ExerciseBlockWithPrevious 内で handleCopyAllPrevious を実装
const handleCopyAllPrevious = useCallback(() => {
  if (!previousRecord) return;
  sets.forEach((set, i) => {
    const prevSet = previousRecord.sets[i];
    if (prevSet?.weight != null && prevSet?.reps != null) {
      onCopyPreviousSet(set.id, { weight: prevSet.weight, reps: prevSet.reps });
    }
  });
}, [previousRecord, sets, onCopyPreviousSet]);
```

**検討した代替案**: `onCopyAllPrevious(workoutExerciseId, exerciseId)` を RecordScreen に持ち上げてDB再クエリする案 → 不要なDB問い合わせが発生するため却下

---

### 3. デフォルト3セット実装

**決定**: `addExercise` 内で `SetRepository.create` を3回呼び3セットを初期化する

**根拠**:
- 前回記録のセット数は `usePreviousRecord` フックがコンポーネントレイヤーで取得するため、`addExercise`（フックレイヤー）では参照不可
- シンプルに3セット固定で初期化し、仕様の「最低3セット保証」を満たす
- 前回記録が3セット以上ある場合のセット数同期は今後の拡張として対応

**実装パターン**:
```typescript
// 初期セット3つを作成（デフォルト3セット）
const sets = await Promise.all([1, 2, 3].map((setNumber) =>
  SetRepository.create({ workoutExerciseId: id, setNumber })
));
store.setSetsForExercise(id, sets);
```

---

### 4. 種目削除ボタンの配置

**決定**: ExerciseBlock ヘッダーの右端に追加。前回記録バッジの左にゴミ箱アイコンを設置

**根拠**:
- ヘッダー右エリアはすでに種目レベルの操作（コピー）を持つため、同エリアに削除も配置するのが自然
- ゴミ箱アイコン（`trash-outline` from Ionicons）で視覚的に明確

**型変更**:
- `ExerciseBlock` に `onDeleteExercise?: () => void` prop を追加
- `ExerciseBlockWithPrevious` に `onDeleteExercise: (workoutExerciseId: string) => void` prop を追加
- `RecordScreen` で `session.removeExercise(workoutExerciseId)` を呼ぶハンドラーを作成

---

### 5. プレースホルダー削除

**決定**: `SetRow` の `NumericInput` の placeholder を削除（空文字または未設定）

**根拠**:
- 現状: `placeholder={previousSet?.weight?.toString() ?? '0'}` で前回値または "0" が表示
- 入力済みに見えるという UX バグを解消
- `NumericInput` の `placeholder` prop は optional なので未渡しで空白になる

**実装**: `placeholder` prop を渡さないか、`unit` ラベルのみ表示のまま

---

### 6. セット番号デザイン

**決定**: 丸バッジ（`rounded-full` の View）から、テキストのみのラベル形式に変更

**根拠**:
- 現状の丸バッジは `NumericInput` の入力欄と視覚的に類似（丸形・灰色背景）
- 番号を `"1."` "2." 形式のテキストラベルにすることで入力欄との区別が明確になる
- コンスティテューション原則II（引き算のデザイン）に沿い、背景を除去する

**変更**:
```tsx
// Before
<View className="w-6 h-6 rounded-full bg-[#F1F3F5] items-center justify-center">
  <Text className="text-[14px] font-semibold text-[#64748b]">{set.setNumber}</Text>
</View>

// After: シンプルなテキストラベル
<Text style={{ width: 24, fontSize: 14, fontWeight: '600', color: '#94a3b8', textAlign: 'center' }}>
  {set.setNumber}
</Text>
```

---

### 7. セット行間の統一

**決定**: インライン前回記録を削除することで自動解消される

**根拠**:
- 現状の不整合の原因: `previousLabel` が存在するとき `<View className="pl-9 py-[2px]">` が追加されて行間が増える（SetRow.tsx L79-88）
- FR-001（インライン前回記録削除）で L79-88 を削除すれば行間は常に一定になる

---

## 影響ファイル一覧

| ファイル | 変更種別 | 主な変更内容 |
|---|---|---|
| `SetRow.tsx` | 変更 | インライン前回記録削除、placeholder削除、セット番号デザイン変更、previousSet/onCopyPrevious prop削除 |
| `ExerciseBlock.tsx` | 変更 | コピーアイコン追加、onDeleteExercise prop追加、onCopyPreviousSet prop削除 |
| `RecordScreen.tsx` | 変更 | handleCopyAllPrevious スタブ削除、onDeleteExercise ハンドラー追加、ExerciseBlockWithPreviousのprop更新 |
| `useWorkoutSession.ts` | 変更 | addExercise のデフォルトセット数を1→3に変更 |

## テスト対象

| テストファイル | テスト内容 |
|---|---|
| `SetRow.test.tsx` (新規) | レンダリング、placeholder無し確認 |
| `ExerciseBlock.test.tsx` (新規) | コピーボタン・削除ボタンレンダリング・コールバック |
| `RecordScreen.test.tsx` (既存更新) | コピー全セット、種目削除のフロー |
| `useWorkoutSession.test.ts` (既存更新) | addExercise が3セット作成することを確認 |
