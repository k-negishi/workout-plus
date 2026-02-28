---
title: Use contentInsetAdjustmentBehavior for Safe Areas
impact: MEDIUM
impactDescription: native safe area handling, no layout shifts
tags: safe-area, scrollview, layout
---

## Use contentInsetAdjustmentBehavior for Safe Areas

Use `contentInsetAdjustmentBehavior="automatic"` on the root ScrollView instead of wrapping content in SafeAreaView or manual padding. This lets iOS handle safe area insets natively with proper scroll behavior.

**Incorrect (SafeAreaView wrapper):**

```tsx
import { SafeAreaView, ScrollView, View, Text } from 'react-native'

function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <View>
          <Text>Content</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Incorrect (manual safe area padding):**

```tsx
import { ScrollView, View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function MyScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top }}>
      <View>
        <Text>Content</Text>
      </View>
    </ScrollView>
  )
}
```

**Correct (native content inset adjustment):**

```tsx
import { ScrollView, View, Text } from 'react-native'

function MyScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior='automatic'>
      <View>
        <Text>Content</Text>
      </View>
    </ScrollView>
  )
}
```

The native approach handles dynamic safe areas (keyboard, toolbars) and allows content to scroll behind the status bar naturally.

---

## プロジェクト固有の SafeArea ルール

### 固定値のパディングで SafeArea を代替しない

`pt-10` や `paddingTop: 40` のような固定値はデバイスによってノッチやホームインジケーターと重なる。

```tsx
// NG: 固定値はデバイスによって足りなかったり多すぎる
<View className="bg-white px-5 pt-10 pb-5">
  <Text>ヘッダー</Text>
</View>
```

### `useSafeAreaInsets` で動的に取得する

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

### BottomTab 配下では `insets.bottom` を設定しない

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

**判断基準**:
- BottomTab 配下（AIScreen, HomeScreen 等）→ `insets.bottom` 不要
- Stack ナビゲーター直下（モーダル・フルスクリーン画面）→ `insets.bottom` を使う
