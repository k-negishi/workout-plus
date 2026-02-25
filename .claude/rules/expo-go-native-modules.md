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
| `react-native-worklets` | `0.5.1` |
| `expo-linear-gradient` | `~15.0.8` |

### peer dep は bundledNativeModules に載っていても自動でピン留めされない

`bundledNativeModules.json` に記載があっても、**`package.json` の直接依存でなければ** pnpm は peer dep の範囲内で最新版を解決する。

```
# 例: react-native-worklets は reanimated の peer dep（>=0.5.0）
# pnpm は最新の 0.7.4 を解決 → Expo Go native は 0.5.1 → クラッシュ
[Worklets] Mismatch between JavaScript part and native part of Worklets (0.7.4 vs 0.5.1)
```

**対処:** `bundledNativeModules.json` に載っているパッケージは、たとえ peer dep 経由でも**直接依存として厳密固定**する。

```json
// apps/mobile/package.json
"react-native-worklets": "0.5.1"  // peer dep に任せず直接追加
```

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

## 3. バージョンミスマッチのデバッグ手順

Expo Go 起動時にクラッシュ（`Mismatch`・`Cannot find native module` 系エラー）が出た場合:

**Step 1: エラーのバージョン番号を読む**

```
[Worklets] Mismatch between JavaScript part and native part of Worklets (0.7.4 vs 0.5.1)
                                                                           ↑ JS版  ↑ native版
```

**Step 2: bundledNativeModules.json で正解を確認する**

```bash
python3 -c "
import json
with open('node_modules/expo/bundledNativeModules.json') as f:
    d = json.load(f)
for k, v in d.items():
    if '<package-name>' in k:
        print(k, v)
"
```

**Step 3: package.json に直接依存を追加して厳密固定**

```json
"<package-name>": "<bundledNativeModules の値>"
```

**Step 4: pnpm install → lock ファイルでバージョンを確認**

```bash
pnpm install
grep "<package-name>@" pnpm-lock.yaml | head -3
```

**Step 5: キャッシュクリア起動で確認**

バージョン切り替え後は古いネイティブキャッシュが残ることがある。
`TurboModuleManager: Timed out waiting for modules to be invalidated` が出た場合も同様。

```bash
pnpm --filter mobile start --clear
```
