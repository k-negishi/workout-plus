/**
 * @workout-plus/shared
 *
 * packages/api の openapi.json から自動生成した型定義を re-export する。
 * 型定義の更新は `pnpm --filter @workout-plus/shared generate:api` で行う。
 */
export type { components, paths } from './generated/api.d';
