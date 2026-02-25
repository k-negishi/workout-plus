import { Hono } from 'hono';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { apiKeyMiddleware } from '../../src/middleware/apiKey.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

/**
 * X-API-Key 認証ミドルウェアのテスト
 */
describe('apiKeyMiddleware', () => {
  const VALID_KEY = 'test-api-key-secret';
  const originalEnv = process.env['API_KEY_SECRET'];

  beforeEach(() => {
    process.env['API_KEY_SECRET'] = VALID_KEY;
  });

  afterEach(() => {
    process.env['API_KEY_SECRET'] = originalEnv;
  });

  function buildApp() {
    const app = new Hono();
    app.onError(errorHandler);
    app.use('/protected/*', apiKeyMiddleware());
    app.get('/protected/resource', (c) => c.json({ ok: true }));
    return app;
  }

  it('正しい API Key で 200 が返ること', async () => {
    const app = buildApp();
    const res = await app.request('/protected/resource', {
      headers: { 'X-API-Key': VALID_KEY },
    });
    expect(res.status).toBe(200);
  });

  it('API Key なしで 401 が返ること', async () => {
    const app = buildApp();
    const res = await app.request('/protected/resource');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('不正な API Key で 401 が返ること', async () => {
    const app = buildApp();
    const res = await app.request('/protected/resource', {
      headers: { 'X-API-Key': 'wrong-key' },
    });
    expect(res.status).toBe(401);
  });

  it('環境変数が未設定の場合すべてのリクエストが 401 になること', async () => {
    delete process.env['API_KEY_SECRET'];
    const app = buildApp();
    const res = await app.request('/protected/resource', {
      headers: { 'X-API-Key': VALID_KEY },
    });
    expect(res.status).toBe(401);
  });
});
