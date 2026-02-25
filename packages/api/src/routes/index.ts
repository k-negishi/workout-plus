import type { OpenAPIHono } from '@hono/zod-openapi';

import { createAIRouter } from './ai/index.js';

/**
 * 全ルートを OpenAPIHono アプリに登録する
 *
 * TODO: 新しいドメインのルートを追加する場合:
 *   import { createWorkoutsRouter } from './workouts/index.js';
 *   app.route('/workouts', createWorkoutsRouter());
 *   対応するルートファイルを routes/workouts/ に作成する
 */
export function registerRoutes(app: OpenAPIHono): void {
  app.route('/ai', createAIRouter());
  // TODO: app.route('/workouts', createWorkoutsRouter());  // #13
  // TODO: app.route('/auth', createAuthRouter());          // #11
  // TODO: app.route('/notifications', createNotificationsRouter()); // #16
  // TODO: app.route('/sync', createSyncRouter());          // #15
}
