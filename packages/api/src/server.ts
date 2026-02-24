/**
 * ローカル開発サーバー
 *
 * Lambda ではなく Node.js HTTP サーバーとして Hono アプリを起動する。
 * 本番デプロイには使用しない（Lambda ハンドラーは src/index.ts）。
 *
 * 起動: pnpm --filter @workout-plus/api dev
 *
 * 必要な環境変数（.env ファイルまたはシェルで設定）:
 *   API_KEY_SECRET   ... X-API-Key 認証キー（任意の文字列でOK）
 *   AWS_REGION       ... Bedrock を使う場合のリージョン（例: ap-northeast-1）
 *   AWS_PROFILE      ... AWS CLI プロファイル名（credential が設定済みの場合）
 */
import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const PORT = Number(process.env['PORT'] ?? 3000);

const app = createApp();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 ローカルサーバー起動: http://localhost:${info.port}`);
  console.log(`📖 Swagger UI:          http://localhost:${info.port}/doc`);
  console.log(`🔑 API_KEY_SECRET:      ${process.env['API_KEY_SECRET'] ? '設定済み' : '⚠️  未設定（X-API-Key 認証が通らない）'}`);
  console.log(`☁️  AWS_REGION:         ${process.env['AWS_REGION'] ?? '⚠️  未設定（Bedrock が使えない）'}`);
});
