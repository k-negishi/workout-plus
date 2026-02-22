# Quickstart: 全体フォントサイズ 1 段階拡大

## 変更確認手順

```bash
# 1. 型チェック
pnpm --filter mobile tsc --noEmit

# 2. テスト実行
pnpm --filter mobile test

# 3. Lint
pnpm lint

# 4. 実機確認
pnpm --filter mobile start
```

## 変更の核心

`typography.ts` の 6 値を +2px するだけで、トークン参照コンポーネントは自動更新される：

```typescript
// typography.ts の変更前後
export const fontSize = {
  xs:  14,  // 12 → 14
  sm:  16,  // 14 → 16
  md:  18,  // 16 → 18
  lg:  20,  // 18 → 20
  xl:  22,  // 20 → 22
  xxl: 26,  // 24 → 26
};
```

## ハードコード確認コマンド

```bash
# ハードコードされた fontSize を検索
grep -r "fontSize: [0-9]" apps/mobile/src/

# NativeWind のハードコードフォントサイズを検索
grep -r "text-\[[0-9]*px\]" apps/mobile/src/
```
