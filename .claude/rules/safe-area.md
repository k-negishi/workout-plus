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
