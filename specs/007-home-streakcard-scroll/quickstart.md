# Quickstart: ホーム画面 StreakCard 固定解除

## 1. 対象テスト実行

```bash
pnpm --filter mobile test -- src/features/home/screens/__tests__/HomeScreen.test.tsx --runInBand
```

期待結果:
- `StreakCard が ScrollView 内に配置される` が PASS
- 既存 HomeScreen テストがすべて PASS

## 2. Lint 実行

```bash
pnpm --filter mobile lint
```

期待結果:
- エラー 0（既存 warning は別途管理）

## 3. 型チェック実行

```bash
pnpm --filter mobile exec tsc --noEmit
```

期待結果:
- PASS
