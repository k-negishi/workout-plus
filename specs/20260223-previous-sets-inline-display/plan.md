# 実装計画: 前回セット表示インラインチップ形式（Issue #138）

## アーキテクチャ概要

変更は UI レイヤー（ExerciseBlock コンポーネント）に閉じる。
ビジネスロジック・DB・フックへの変更は不要。

## 依存関係

```
RecordScreen.tsx
  └── ExerciseBlockWithPrevious（内部コンポーネント）
        ├── usePreviousRecord フック（変更なし）
        └── ExerciseBlock コンポーネント（変更あり）
```

## 変更設計

### ExerciseBlock.tsx

#### 削除するもの
- `onCopyAllPrevious` prop
- `showPreviousRecord` prop
- `MUSCLE_GROUP_LABELS` 定数
- `muscleLabel` 変数
- `previousBadgeText` useMemo
- 部位ラベル `<Text>` 要素
- バッジ `TouchableOpacity`（onCopyAllPrevious）

#### 追加するもの
- `CIRCLED_NUMBERS` 定数（①〜⑳）
- `getCircledNumber(n: number): string` ヘルパー関数
- 前回チップ行 `<View>` （flexWrap: 'wrap'）をヘッダー下・カラムヘッダー上に配置

#### チップ行のレイアウト
```tsx
{previousRecord && (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
    <Text style={chipStyle}>前回 {format(previousRecord.workoutDate, 'M/d')}</Text>
    {previousRecord.sets.map((set, i) => (
      <Text key={set.id} style={chipStyle}>
        {getCircledNumber(i + 1)} {set.weight ?? '-'}×{set.reps ?? '-'}
      </Text>
    ))}
  </View>
)}
```

### RecordScreen.tsx

#### 削除するもの
- `PreviousSetData` 型
- `ExerciseBlockWithPrevious` の `onCopyPreviousSet` prop
- `ExerciseBlockWithPrevious` 内の `handleCopyAllPrevious`
- RecordScreen の `handleCopyPreviousSet`
- `onCopyPreviousSet={handleCopyPreviousSet}` の呼び出し

### ExerciseBlock.test.tsx

#### 削除するテスト
- `前回記録コピーボタン` describe（3テスト）
- `バッジテキスト` describe（1テスト）
- `showPreviousRecord prop` describe（3テスト）
- `種目削除ボタンの配置` 内の `バッジが削除ボタンより先にレンダリングされる` テスト

#### 追加するテスト
- 部位ラベルが表示されないこと
- 前回記録がある場合: `前回 2/20` テキストが表示される
- 前回記録がある場合: `① 60×10` `② 65×8` が表示される
- 前回記録が null の場合: チップ行が非表示
- `createDefaultProps` から `onCopyAllPrevious` を削除

## TDD 手順

1. **RED**: テストを先に更新（削除・追加）し、失敗を確認
2. **GREEN**: ExerciseBlock.tsx と RecordScreen.tsx を実装
3. **REFACTOR**: 不要なコードを整理

## リスク

- `onCopyAllPrevious` が他のファイルで使われていないか確認済み（RecordScreen.tsx のみ）
- RecordScreen のテストで `onCopyAllPrevious` を参照しているか確認必要
