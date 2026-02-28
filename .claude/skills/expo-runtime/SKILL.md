---
name: expo-runtime
description: Expo Go / Hermes ランタイム環境の制約と対処法。ネイティブモジュールのバージョン固定・Hermes エンジンの polyfill など、Expo Go 起動時クラッシュの診断と解決に使用する。「Cannot find native module」「Mismatch between JavaScript part and native part」「AbortSignal.timeout is not a function」などのエラーが出たら参照する。
allowed-tools: Read, Bash
---

# Expo Go / Hermes ランタイム制約

Expo Go と Hermes エンジンに起因するランタイムエラーの診断・対処リファレンス。

---

## Expo Go ネイティブモジュール制約

### 1. バージョンは `~`（tilde）か厳密固定。`^`（caret）禁止

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

### 2. ネイティブモジュール追加前に Expo Go 対応を確認する

Expo Go に含まれていない native module は `Cannot find native module 'X'` でクラッシュする。

**確認手順:**

```bash
# bundledNativeModules に載っているか
cat node_modules/expo/bundledNativeModules.json | grep <package-name>
```

**Expo Go で動かない例:**
- `burnt` → `Alert` / `ToastAndroid` で代替
- `react-native-vision-camera` → Expo Go では使用不可

動かない場合は JS-only の代替を探すか、Expo Dev Build へ移行する。

### 3. バージョンミスマッチのデバッグ手順

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

```bash
pnpm --filter mobile start --clear
```

---

## Hermes エンジンの制約と polyfill

### `crypto.getRandomValues` は Hermes に未実装

Hermes エンジンには `crypto.getRandomValues` がない。`ulid` など PRNG に依存するライブラリを使う場合は polyfill が必須。

**症状:**
```
ULIDError: Failed to find a reliable PRNG (PRNG_DETECT)
```

**対処:** `apps/mobile/src/polyfill.ts` に polyfill を実装し、`index.ts` の先頭で import する。

```ts
// apps/mobile/src/polyfill.ts
if (typeof global.crypto?.getRandomValues !== 'function') {
  global.crypto = {
    ...(typeof global.crypto === 'object' ? global.crypto : {}),
    getRandomValues: <T extends ArrayBufferView>(buffer: T): T => {
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    },
  };
}
```

```ts
// apps/mobile/index.ts — 必ず最初の行で import する
import './src/polyfill';
import { registerRootComponent } from 'expo';
```

> 注意: `Math.random` ベースのため暗号強度はない。ID 生成（ulid 等）用途に限る。

### `AbortSignal.timeout()` は Hermes に未実装

`AbortSignal.timeout(ms)` スタティックメソッドは Node.js・ブラウザには存在するが Hermes にない。

**症状:**
```
TypeError: AbortSignal.timeout is not a function (it is undefined)
```

**対処:** `AbortController + setTimeout + try/finally` で代替する。

```typescript
// NG: Hermes でクラッシュ
await fetch(url, { signal: AbortSignal.timeout(30000) });

// OK: Hermes 互換
const controller = new AbortController();
const timeoutId = setTimeout(() => { controller.abort(); }, 30000);
try {
  await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeoutId); // 正常終了・エラー問わず必ずクリア
}
```

> `finally` で `clearTimeout` を呼ばないとタイマーが残り続けてリソースリークになる。
