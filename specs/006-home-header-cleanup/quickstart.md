# Quickstart: ホームヘッダー簡素化

## 1. テスト実行

```bash
pnpm --filter mobile test -- src/features/home/screens/__tests__/HomeScreen.test.tsx --runInBand
```

期待結果:
- `ヘッダーに挨拶テキストを表示しない` が PASS
- 既存 HomeScreen テストも PASS

## 2. 目視確認（任意）

1. アプリを起動して Home タブを開く
2. ヘッダーに挨拶文・右上丸アイコンがないことを確認
3. StreakCard がヘッダー上部に表示されることを確認
