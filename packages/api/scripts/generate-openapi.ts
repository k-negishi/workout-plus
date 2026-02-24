/**
 * OpenAPI スペック生成スクリプト
 *
 * 実行方法: pnpm --filter @workout-plus/api build:openapi
 * 出力先: packages/api/openapi.json
 *
 * Lambda を起動せずに Hono アプリから直接 OpenAPI スペックを生成する。
 * 生成された openapi.json は packages/shared の型生成に使用する。
 * CI でも実行し、型の乖離を防ぐ。
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = createApp();

// OpenAPIHono の getOpenAPIDocument() でスペックオブジェクトを取得
const spec = app.getOpenAPIDocument({
  openapi: '3.1.0',
  info: {
    title: 'workout-plus API',
    version: '0.1.0',
    description: 'workout-plus モバイルアプリのバックエンド API',
  },
  servers: [{ url: 'https://api.workout-plus.example.com', description: '本番' }],
});

const outputPath = resolve(__dirname, '../openapi.json');
writeFileSync(outputPath, JSON.stringify(spec, null, 2));
console.log(`✅ OpenAPI スペックを生成しました: ${outputPath}`);
