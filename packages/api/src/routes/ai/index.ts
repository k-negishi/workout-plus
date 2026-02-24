import { OpenAPIHono } from '@hono/zod-openapi';
import { chatRoute, handleAIChat } from './chat.js';
import { apiKeyMiddleware } from '../../middleware/apiKey.js';
import { createAPIError } from '../../middleware/errorHandler.js';

/**
 * /ai ルートグループ
 *
 * TODO: ストリーミングルート追加時:
 *   const streamRoute = createRoute({ method: 'get', path: '/chat/stream', ... })
 *   router.openapi(streamRoute, streamHandler)
 *   → InvokeModelWithResponseStreamCommand を使い SSE で返す
 */
export function createAIRouter(): OpenAPIHono {
  const router = new OpenAPIHono();

  // /ai/chat には API Key 認証を適用
  router.use('/chat', apiKeyMiddleware());

  router.openapi(chatRoute, async (c) => {
    const body = c.req.valid('json');
    try {
      const result = await handleAIChat(body);
      return c.json(result, 200);
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      throw createAPIError('INTERNAL_ERROR', '予期せぬエラーが発生しました');
    }
  });

  return router;
}
