---
paths:
  - "apps/mobile/package.json"
  - "apps/mobile/src/**/*.{ts,tsx}"
---

# Expo Go ネイティブモジュールのルール

## 1. バージョンは `~`（tilde）か厳密固定。`^`（caret）禁止

Expo Go はネイティブコードをバンドル済み。`^` を使うと pnpm が新しいマイナーバージョンを解決し、JS/Native 間でバージョン不整合が起きてクラッシュする。

```json
// NG: caret は minor/patch の更新を許容する → Native ABI 不整合でクラッシュ
"react-native-screens": "^4.16.0"

// OK: tilde か厳密固定で bundledNativeModules に合わせる
"react-native-screens": "4.16.0"
"react-native-reanimated": "~4.1.1"
```

互換バージョンの確認方法:

```bash
cat node_modules/expo/bundledNativeModules.json
npx expo install --fix
```

**SDK 54 の固定値（Expo Go 向け）:**

| パッケージ | バージョン |
|---|---|
| `react-native-screens` | `4.16.0`（4.17+ は破壊的変更あり） |
| `react-native-reanimated` | `~4.1.1` |
| `react-native-gesture-handler` | `~2.28.0` |
| `react-native-safe-area-context` | `~5.6.0` |
| `react-native-svg` | `15.12.1` |
| `expo-linear-gradient` | `~15.0.8` |

## 2. ネイティブモジュール追加前に Expo Go 対応を確認する

Expo Go に含まれていない native module は `Cannot find native module 'X'` でクラッシュする。追加前に必ず確認する。

**確認手順:**

```bash
# bundledNativeModules に載っているか
cat node_modules/expo/bundledNativeModules.json | grep <package-name>
```

**Expo Go で動かない例:**
- `burnt` → `Alert` / `ToastAndroid` で代替
- `react-native-vision-camera` → Expo Go では使用不可

動かない場合は JS-only の代替を探すか、Expo Dev Build へ移行する。
