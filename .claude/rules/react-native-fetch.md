---
paths:
  - "apps/mobile/src/**/*.{ts,tsx}"
---

# React Native での fetch パターン

## `fetch(Request)` 形式は Hermes で不安定

`new Request(url, options)` を作成して `fetch(request)` に渡す形式は、
React Native / Hermes で `"Network request failed"` を引き起こすことがある。

```typescript
// NG: Request オブジェクト経由の呼び出し（openapi-fetch 等が内部で使う形式）
const req = new Request('https://api.example.com/path', { method: 'POST', headers, body });
await fetch(req); // Hermes で "Network request failed" になることがある

// OK: url + options の標準形式
await fetch('https://api.example.com/path', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
  body: JSON.stringify(data),
  signal: controller.signal,
});
```

**確認済みの問題ライブラリ:** `openapi-fetch` v0.17.0（内部で `fetch(Request)` を使用）

## HTTP クライアントの選定指針

React Native プロジェクトで HTTP クライアントを選ぶ際の優先順位:

| 方法 | 推奨度 | 理由 |
|---|---|---|
| raw `fetch(url, options)` | ★★★ | Hermes で確実に動作 |
| `axios` | ★★☆ | XHR ベースで安定しているが依存が増える |
| `openapi-fetch` 等 | ★☆☆ | `fetch(Request)` 形式を使うため注意が必要 |

## 型安全な raw fetch のパターン

openapi-typescript で生成した型を使いつつ raw fetch を呼ぶ場合:

```typescript
// レスポンス型を明示的にキャストする
const response = await fetch(`${baseUrl}/ai/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
  body: JSON.stringify(requestBody),
});

if (!response.ok) {
  const error = await response.json() as { error?: string; code?: string };
  throw new Error(error.error ?? 'API エラー');
}

const data = await response.json() as { message: string };
return data;
```
