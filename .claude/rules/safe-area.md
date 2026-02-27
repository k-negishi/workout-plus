---
paths:
  - "apps/mobile/src/**/*.tsx"
---

# SafeArea の扱い方

## 固定値のパディングで SafeArea を代替しない

`pt-10` や `paddingTop: 40` のような固定値はデバイスによってノッチやホームインジケーターと重なる。

```tsx
// NG: 固定値はデバイスによって足りなかったり多すぎる
<View className="bg-white px-5 pt-10 pb-5">
  <Text>ヘッダー</Text>
</View>
```

## `useSafeAreaInsets` で動的に取得する

```tsx
// OK: デバイスの安全領域を動的に取得
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingHorizontal: 20 }}>
      <Text>ヘッダー</Text>
    </View>
  );
}
```

スクロールビューは `contentInsetAdjustmentBehavior="automatic"` を使うと iOS がネイティブに処理してくれる。

```tsx
// OK: ScrollView の場合
<ScrollView contentInsetAdjustmentBehavior="automatic">
  {/* ... */}
</ScrollView>
```

## BottomTab 配下では `insets.bottom` を設定しない

`BottomTabNavigator` 配下の画面では、TabBar がすでに `insets.bottom` を消費している。
画面側でさらに `paddingBottom: insets.bottom` を設定すると**二重余白**になる。

```tsx
// NG: BottomTab 配下で insets.bottom を重ねがけする（二重余白になる）
const insets = useSafeAreaInsets();
<View style={{ paddingBottom: insets.bottom }}>
  <ChatInput />
</View>

// OK: BottomTab 配下では insets を使わない（TabBar が吸収する）
<View>
  <ChatInput />
</View>
```

**判断基準**: 画面が BottomTab の直下にあるか確認する。
- BottomTab 配下（AIScreen, HomeScreen 等）→ `insets.bottom` 不要
- Stack ナビゲーター直下（モーダル・フルスクリーン画面）→ `insets.bottom` を使う
