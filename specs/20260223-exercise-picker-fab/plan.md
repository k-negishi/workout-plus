# 実装計画: 種目選択画面 FAB

## アーキテクチャ

### 変更箇所
1. `ExercisePickerScreen.tsx` のみ変更
   - `ListFooterComponent` から既存の `+ カスタム種目を追加` ボタンを削除
   - `SectionList` の後ろ（同じ `flex-1` コンテナ内）に FAB を absolute 配置
   - FAB タップで `setIsCreating(true)` を呼び出す
   - `isCreating` が true の場合は FAB を非表示にする

### コンポーネント構造の変更

```
<View className="flex-1 bg-white">
  {/* ヘッダー */}
  {/* 検索バー */}
  {/* カテゴリタブ */}
  <SectionList ... />
  {/* multi モードフッター */}

  {/* NEW: FAB（absolute配置で他要素にオーバーレイ） */}
  {!isCreating && (
    <TouchableOpacity style={styles.fab} ... />
  )}
</View>
```

### スタイル

FAB のスタイルは `StyleSheet.create` で定義する（position: absolute はインラインスタイルが確実）。

```typescript
const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4D94FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
```

## 依存関係
- `@expo/vector-icons` (Ionicons): 既に導入済み、追加インストール不要
- 新しい依存関係なし
