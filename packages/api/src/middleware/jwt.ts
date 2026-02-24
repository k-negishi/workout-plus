import type { MiddlewareHandler } from 'hono';

/**
 * Cognito JWT 認証ミドルウェア（stub）
 *
 * TODO: Issue #11（Cognito セットアップ）完了後に実装する
 *   実装内容:
 *     1. Authorization: Bearer <token> ヘッダーを取得
 *     2. Cognito の JWKS エンドポイントから公開鍵を取得（キャッシュ推奨）
 *     3. JWT を検証し、claims.sub を c.set('userId', sub) でセット
 *     4. 検証失敗時は 401 を返す
 *   依存パッケージ: jose または aws-jwt-verify
 *
 * 切り替え方法:
 *   src/app.ts で app.use('/workouts/*', jwtMiddleware()) のコメントを外す
 *   現在の apiKeyMiddleware と共存させることも可能（段階的移行）
 */
export const jwtMiddleware = (): MiddlewareHandler => async (_c, next) => {
  await next();
};
