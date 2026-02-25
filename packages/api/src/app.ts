import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { errorHandler } from './middleware/errorHandler.js';
import { registerRoutes } from './routes/index.js';

/**
 * Hono アプリケーションファクトリ
 *
 * テストでは createApp() を呼び出してインスタンスを作成する（DI 容易）。
 * Lambda エントリーポイント（src/index.ts）では createApp() の戻り値を handle() に渡す。
 *
 * TODO: Cognito JWT 認証対応（#11）
 *   app.use('/workouts/*', jwtMiddleware());
 *   src/middleware/jwt.ts の stub を実装化する
 *
 * TODO: ユーザープロファイル対応
 *   /users/profile エンドポイントを追加し、
 *   AI チャットのシステムプロンプトにユーザーの目標・自由記述を反映する
 */
export function createApp(): OpenAPIHono {
  const app = new OpenAPIHono();

  // CORS（モバイルアプリからのリクエストを許可）
  // TODO: 本番環境では origin を Expo アプリの bundle ID に絞る
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    }),
  );

  // 共通エラーハンドラー
  app.onError(errorHandler);

  // ヘルスチェック（認証不要）
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // 全ルート登録
  registerRoutes(app);

  // OpenAPI スペックエンドポイント
  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'workout-plus API',
      version: '0.1.0',
      description: 'workout-plus モバイルアプリのバックエンド API',
    },
    servers: [
      {
        url: process.env['API_BASE_URL'] ?? 'http://localhost:3000',
        description: process.env['API_BASE_URL'] ? '本番' : 'ローカル',
      },
    ],
  });

  // Swagger UI
  app.get('/doc', swaggerUI({ url: '/openapi.json' }));

  return app;
}
