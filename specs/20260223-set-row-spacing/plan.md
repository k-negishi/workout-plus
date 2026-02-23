# 実装計画: セット間行間拡大 (Issue #128)

## アーキテクチャ概要

変更範囲は UI 層のみ。DB・Store・Repository への影響なし。

```
ExerciseBlock.tsx  ←  gap: 8 → 12
SetRow.tsx         ←  外枠 View に paddingVertical: 4 追加
ExerciseBlock.test.tsx  ←  スタイル検証テスト追加（既存テスト維持）
SetRow.test.tsx         ←  スタイル検証テスト追加（既存テスト維持）
```

## 変更内容

### 1. ExerciseBlock.tsx

```tsx
// Before
<View style={{ gap: 8 }}>
  <FlatList ... />
</View>

// After
<View style={{ gap: 12 }}>
  <FlatList ... />
</View>
```

### 2. SetRow.tsx

```tsx
// Before
<View>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    ...
  </View>
</View>

// After
<View style={{ paddingVertical: 4 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    ...
  </View>
</View>
```

## TDD アプローチ

1. **Red**: ExerciseBlock テストにセットコンテナの gap 検証を追加（失敗）
2. **Green**: ExerciseBlock.tsx の gap を 12 に変更（通過）
3. **Red**: SetRow テストに外枠 View の paddingVertical 検証を追加（失敗）
4. **Green**: SetRow.tsx に paddingVertical: 4 を追加（通過）
5. **Refactor**: 既存テストとともに全件パスを確認

## 依存関係

- 外部依存なし
- 既存テストの修正不要（新しいアサーションの追加のみ）

## リスク

- リスクなし（スタイル値の変更のみ）
