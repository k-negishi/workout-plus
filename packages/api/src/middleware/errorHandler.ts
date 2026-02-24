import type { Context, ErrorHandler } from 'hono';
import type { APIError, ErrorCode } from '../schemas.js';

/**
 * API エラーコードに対応する HTTP ステータスコードのマッピング
 *
 * TODO: 将来追加予定のコード:
 *   COGNITO_AUTH_ERROR: 401（#11 Cognito 対応後）
 *   STREAM_ERROR: 502（ストリーミング対応後）
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  BEDROCK_ERROR: 502,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
};

/**
 * API エラー型かどうかを判定する型ガード
 */
function isAPIError(err: unknown): err is Error & APIError & { isAPIError: true } {
  return (
    err instanceof Error &&
    'isAPIError' in err &&
    (err as { isAPIError: unknown }).isAPIError === true
  );
}

/**
 * Hono 共通エラーハンドラー
 * app.onError に登録する。
 * 既知の APIError は対応するステータスコードで返し、未知エラーは 500 を返す。
 */
export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  console.error('[API Error]', err);

  if (isAPIError(err)) {
    const status = ERROR_STATUS_MAP[err.code] ?? 500;
    return c.json<APIError>(
      { error: err.error, code: err.code },
      status as Parameters<typeof c.json>[1],
    );
  }

  return c.json<APIError>({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500);
};

/**
 * APIError を生成するユーティリティ関数
 * throw createAPIError('UNAUTHORIZED', '...') として使用する
 */
export function createAPIError(
  code: ErrorCode,
  message: string,
): Error & APIError & { isAPIError: true } {
  const err = Object.assign(new Error(message), {
    code,
    error: message,
    isAPIError: true as const,
  });
  return err;
}
