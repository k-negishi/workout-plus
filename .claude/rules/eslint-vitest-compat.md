# ESLint 10 + vitest プラグイン互換性

## 問題

`eslint-plugin-vitest@0.5.x` は内部で `@typescript-eslint/utils@7.x` に依存しており、
ESLint 10 と組み合わせると以下のエラーで即クラッシュする:

```
TypeError: Class extends value undefined is not a constructor or null
    at LegacyESLint.js ...
```

## 解決策

`eslint-plugin-vitest` の代わりに公式後継パッケージ `@vitest/eslint-plugin` を使う。

```bash
pnpm remove eslint-plugin-vitest
pnpm add -D @vitest/eslint-plugin
```

```js
// eslint.config.mjs
import vitest from '@vitest/eslint-plugin';  // ← eslint-plugin-vitest ではない

export default [
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
];
```

## なぜ起きるか

pnpm の peer dep 解決で `eslint-plugin-vitest@0.5.x` が `@typescript-eslint/utils@7.x` を
要求し、同一プロセス内で `@typescript-eslint/utils@8.x`（ESLint 10 対応版）と競合する。
monorepo ではホイスト先が意図せず 7.x になるケースがある。

## 適用タイミング

- vitest を使うパッケージに ESLint を導入するとき
- ESLint を 9 → 10 にアップグレードするとき
