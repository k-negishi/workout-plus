# Ionicons 使用ガイド

workout-plus プロジェクトのアイコン使用規約と推奨アイコン対応表。
このファイルは workout-design スキルの参照ファイルです（A案: アイコン追加・変更時のみ Read）。

---

## 基本方針: 絵文字・テキスト記号は使わない

絵文字（📊 🗑 ✎）やUnicode記号はOS・フォントによって見た目が変わる。
**`@expo/vector-icons` の `Ionicons` を必ず使うこと。**

```tsx
// NG: 絵文字・テキスト記号
<Text>{'✎'}</Text>
<Text>{'🗑'}</Text>
<Text>{'📊'}</Text>

// OK: Ionicons
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="create-outline" size={22} color="#475569" />
<Ionicons name="trash-outline" size={22} color="#EF4444" />
<Ionicons name="stats-chart-outline" size={22} color="#4D94FF" />
```

---

## ワークアウトアプリの推奨アイコン対応表

| 用途 | Ionicons name | サイズ | カラー |
|---|---|---|---|
| 戻るボタン | `chevron-back` | 24 | #475569 |
| 編集 | `create-outline` | 22 | #475569 |
| 削除 | `trash-outline` | 22 | #EF4444 |
| 履歴・統計 | `stats-chart-outline` | 22 | #4D94FF |
| お気に入り（未登録） | `heart-outline` | 22 | #64748b |
| お気に入り（登録済み） | `heart` | 22 | #EF4444 |
| 検索 | `search-outline` | 20 | #64748b |
| 並び替え | `reorder-three-outline` | 22 | #475569 |
| 追加・新規 | `add` | 24 | #ffffff（FAB内） |
| 閉じる | `close` | 24 | #475569 |

---

## テストでの Ionicons モック

テスト環境では `@expo/vector-icons` をモックして testID / accessibilityLabel を通す:

```typescript
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    const C = (props: Record<string, unknown>) =>
      React.createElement(name, {
        testID: props['testID'],
        accessibilityLabel: props['accessibilityLabel'],
      });
    C.displayName = name;
    return C;
  };
  return { __esModule: true, Ionicons: mockIcon('Ionicons') };
});
```
