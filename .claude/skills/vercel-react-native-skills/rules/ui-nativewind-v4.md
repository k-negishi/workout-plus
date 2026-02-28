---
title: NativeWind v4 Setup and Layout Rules
impact: HIGH
impactDescription: CSS classes must be explicitly imported; layout props require inline styles
tags: nativewind, styling, layout, setup
---

## NativeWind v4 セットアップ要件

### `global.css` の明示的 import が必須

`withNativeWind()` は Metro の変換パイプラインを設定するだけで、CSS のバンドル取り込みは行わない。
エントリーポイントでの明示的な import が必須。import がないと全 className が無効になる。

```ts
// index.ts — 必ず明示的に import する
import './src/polyfill';
import './src/global.css'; // ← これが必須（withNativeWind() では不十分）
```

### v4 の正しいセットアップ手順

1. `index.ts` で `import './global.css'` する
2. `metro.config.js` に `withNativeWind(config, { input: './src/global.css' })` を設定する
3. `babel.config.js` に `jsxImportSource: 'nativewind'` を設定する

**注意:** `nativewind/babel` プラグインは v4 では**存在しない**（追加するとクラッシュする）。

### レイアウト系 className は効かない → inline style を使う

NativeWind v4 では Flexbox / Box Model 系のプロパティは inline style で書く必要がある。

```tsx
// NG: レイアウト系 className は効かない場合がある
<View className="flex-1 flex-row items-center justify-between px-4" />

// OK: inline style で書く
<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }} />

// OK: StyleSheet でまとめる
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
<View style={styles.container} />
```

### 使用可否の分類

| 種別 | 例 | 使用方法 |
|---|---|---|
| レイアウト系 | `flex-1`, `flex-row`, `flex-col`, `items-*`, `justify-*`, `self-*`, `grow`, `shrink` | **inline style / StyleSheet のみ** |
| スペーシング | `p-4`, `px-4`, `mt-2`, `gap-2` | **inline style / StyleSheet のみ** |
| サイズ | `w-full`, `h-10`, `min-h-0` | **inline style / StyleSheet のみ** |
| 色・装飾 | `bg-white`, `text-gray-500`, `rounded-lg`, `border` | NativeWind className 使用可 |

> **判断基準:** Flexbox / Box Model に関わるプロパティはすべて inline style で書く。色・角丸・ボーダーなど見た目の装飾は className のままでよい。
