---
paths:
  - "apps/mobile/src/**/*.{ts,tsx}"
  - "apps/mobile/index.ts"
---

# Hermes エンジンの制約と polyfill

## `crypto.getRandomValues` は Hermes に未実装

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
