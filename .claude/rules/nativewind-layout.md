---
paths:
  - "apps/mobile/src/**/*.{ts,tsx}"
---

# NativeWind レイアウト className の制約

## ✅ 解決済み（2026-02-22）

**原因:** `index.ts` に `import './src/global.css'` が無かったため、CSS がバンドルに含まれず全クラスが無効だった。

`withNativeWind()` は Metro の変換パイプラインを設定するだけで、CSS のバンドル取り込みは行わない。エントリーポイントでの明示的な import が必須。

```ts
// index.ts
import './src/polyfill';
import './src/global.css'; // ← これが必須
```

現在は全 className（レイアウト含む）が正常に動作する。

---

## ⚠️ 過去の経緯（参考）

修正前は `flex-1` / `flex-row` などが効かず、HomeScreen 等で inline style に置換対応していた。現在は不要だが、既存の inline style はそのまま残している。

## セットアップ要件（新規プロジェクト向け）

### レイアウト系スタイルが効かない場合のチェックリスト

1. `index.ts` または `App.tsx` で `import './global.css'` しているか
2. `metro.config.js` に `withNativeWind(config, { input: './src/global.css' })` があるか
3. `babel.config.js` に `jsxImportSource: 'nativewind'` があるか（`nativewind/babel` プラグインは v4 では**不要・存在しない**）

### 旧ルール（現在は不要・参考のみ）

以下は修正前の回避策。現在は className を自由に使用可能。

```tsx
// NG: NativeWind のレイアウト系 className は効かない
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

## 既存コードへの対応

`HomeScreen` / `QuickStatsWidget` / `CalendarScreen` / `RecordScreen` / `WorkoutDetailScreen` / `TimerBar` は既に inline style へ置換済み（2026-02-22）。
新規コンポーネントを追加する際も同じルールに従う。
