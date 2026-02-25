import type { MiddlewareHandler } from 'hono';

import { createAPIError } from './errorHandler.js';

/**
 * X-API-Key 認証ミドルウェア
 *
 * リクエストヘッダーの `X-API-Key` を環境変数 `API_KEY_SECRET` と照合する。
 * 本番環境では Secrets Manager から読み込む（Lambda 環境変数経由）。
 * 将来的に Cognito JWT 認証（#11）に移行する際は、このミドルウェアを差し替える。
 */
export function apiKeyMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const expectedKey = process.env['API_KEY_SECRET'];

    // 環境変数未設定の場合はすべて拒否（設定ミスを防ぐ）
    if (!expectedKey) {
      throw createAPIError('UNAUTHORIZED', 'Unauthorized: API key not configured');
    }

    const providedKey = c.req.header('X-API-Key');

    if (!providedKey || providedKey !== expectedKey) {
      throw createAPIError('UNAUTHORIZED', 'Unauthorized: Invalid or missing API key');
    }

    await next();
  };
}
