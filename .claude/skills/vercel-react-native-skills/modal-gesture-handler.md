# iOS fullScreen Modal × GestureHandlerRootView アーキテクチャ (CRITICAL)

vercel-react-native-skills スキルの参照ファイル（A案: Modal 実装・ボタンタッチ不能問題時に Read）。
iOS fullScreen Modal 内で GestureHandlerRootView を正しく配置しないとヘッダーボタンがタップできなくなる CRITICAL パターン。

---

## 11. iOS fullScreen Modal × GestureHandlerRootView アーキテクチャ (CRITICAL)

### 問題

iOS の `Modal`（`presentationStyle="fullScreen"`）は App.tsx の `GestureHandlerRootView` とは**別 UIViewController** に描画される。
そのため Modal 内に独自の GHRV が必要だが、**DraggableFlatList などジェスチャー対象だけを包む**と以下の問題が起きる:

- Reanimated が GHRV の native frame をヘッダー方向へ拡張する
- 拡張された native frame が RNGH のジェスチャーレコグナイザーによって先にインターセプトされる
- ヘッダーボタン（キャンセル・保存）がタップできなくなる

**効かないワークアラウンド（やってはいけない）:**

| 試みた対処 | なぜ効かないか |
|---|---|
| `zIndex: 1` をヘッダーに設定 | iOS UIKit レベルでは z-order は JS レイヤーと独立している |
| JSX 順序でヘッダーを先に置く | 同上、UIKit レベルでは効かない |
| ヘッダーを GHRV の外側 View に移動 | GHRV の native frame 拡張はヘッダー領域もカバーしてしまう |

### 解決: GHRV を Modal 全体（ヘッダー + コンテンツ）でラップする

```tsx
// ❌ NG: GHRV が DraggableFlatList だけを包む
<Modal presentationStyle="fullScreen">
  <View>
    <View>{/* ヘッダー ← GHRV 外。タッチをインターセプトされる */}</View>
    <GestureHandlerRootView>
      <DraggableFlatList />
    </GestureHandlerRootView>
  </View>
</Modal>

// ✅ OK: GHRV が Modal 全体をカバー
<Modal presentationStyle="fullScreen">
  <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={{ width: windowWidth, flex: 1, paddingTop: insets.top }}>
      <View>{/* ヘッダー ← GHRV 内。RNGH に正しく参加 */}</View>
      <DraggableFlatList />  {/* 別 GHRV 不要。GHRV の子孫として動作 */}
    </View>
  </GestureHandlerRootView>
</Modal>
```

### ヘッダーボタンは RNGH の TouchableOpacity を使う

Modal 内の GHRV では、ヘッダーボタンに **`react-native-gesture-handler` の `TouchableOpacity`** を使うこと。
`react-native` の `Pressable` ではなく RNGH のコンポーネントを使うことで、RNGH ジェスチャーコーディネーターに正しく参加する。

```tsx
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';

// ヘッダーボタン
<TouchableOpacity onPress={onClose} style={...}>
  <Text>キャンセル</Text>
</TouchableOpacity>
```

### width: windowWidth の必要性

Modal 内の `flex: 1` View は Yoga では画面幅に収まるはずだが、
Reanimated が native レイヤーで bounds を水平方向に拡張することがある。
`useWindowDimensions().width` を `width` に明示指定することでボタンの押し出しを防ぐ。

```tsx
const { width: windowWidth } = useWindowDimensions();
<View style={{ width: windowWidth, flex: 1 }}>
```

**実績**: ExerciseReorderModal（Issue #189）で適用。キャンセル・保存ボタンのタッチ不能問題を根本解消。
