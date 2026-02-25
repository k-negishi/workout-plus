import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/errorHandler.js';
import type { APIError } from '../../src/types/index.js';

/**
 * errorHandler ミドルウェアのテスト
 * Hono の app.onError に登録するエラーハンドラーの動作を検証する
 */
describe('errorHandler', () => {
  function buildApp() {
    const app = new Hono();
    app.onError(errorHandler);
    return app;
  }

  it('APIError 型のエラー（UNAUTHORIZED）が 401 で返ること', async () => {
    const app = buildApp();
    app.get('/test', () => {
      const err: APIError & Error = Object.assign(new Error('Unauthorized'), {
        code: 'UNAUTHORIZED' as const,
        error: 'Unauthorized: Invalid or missing API key',
        isAPIError: true,
      });
      throw err;
    });

    const res = await app.request('/test');
    expect(res.status).toBe(401);
    const body = (await res.json()) as APIError;
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('APIError 型のエラー（BEDROCK_ERROR）が 502 で返ること', async () => {
    const app = buildApp();
    app.get('/test', () => {
      const err = Object.assign(new Error('Bedrock Error'), {
        code: 'BEDROCK_ERROR' as const,
        error: 'Bedrock の呼び出しに失敗しました',
        isAPIError: true,
      });
      throw err;
    });

    const res = await app.request('/test');
    expect(res.status).toBe(502);
  });

  it('未知のエラーが 500 で返ること', async () => {
    const app = buildApp();
    app.get('/test', () => {
      throw new Error('予期せぬエラー');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(500);
    const body = (await res.json()) as APIError;
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('エラーログが console.error に出力されること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = buildApp();
    app.get('/test', () => {
      throw new Error('テストエラー');
    });

    await app.request('/test');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
