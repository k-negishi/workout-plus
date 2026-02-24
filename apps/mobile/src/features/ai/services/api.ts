import type { paths } from '@workout-plus/shared';
import createClient from 'openapi-fetch';

import type { ChatMessage, IAIService, WorkoutHistoryContext } from '../types/index';

type APIAIServiceConfig = {
  /** API のベース URL（例: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com） */
  baseUrl: string;
  /** X-API-Key ヘッダーに付与するシークレット */
  apiKey: string;
};

/**
 * APIAIService
 *
 * packages/api の POST /ai/chat エンドポイントを呼び出す本番用 AI サービス。
 * openapi-fetch + 自動生成型 (packages/shared) でリクエスト/レスポンスを型安全に扱う。
 * IAIService インターフェースを実装しているため MockAIService と透過的に差し替え可能。
 *
 * TODO: openapi-fetch 導入後の将来対応
 *   - ストリーミング: stream() メソッドを追加。packages/api が SSE に対応した後に実装
 *   - 認証: X-API-Key → Cognito JWT（Issue #11 完了後）。baseUrl の変更とともに対応
 */
export class APIAIService implements IAIService {
  private readonly client: ReturnType<typeof createClient<paths>>;
  /** X-API-Key を params.header で明示的に渡すために保持する（openapi-fetch 型要件） */
  private readonly apiKey: string;

  constructor(config: APIAIServiceConfig) {
    this.apiKey = config.apiKey;
    this.client = createClient<paths>({
      baseUrl: config.baseUrl,
    });
  }

  async chat(params: {
    message: string;
    conversationHistory: ChatMessage[];
    workoutHistory: WorkoutHistoryContext;
  }): Promise<{ content: string }> {
    const { message, conversationHistory, workoutHistory } = params;

    // ChatMessage → ConversationMessage 変換（role と content だけ送る）
    const conversationForAPI = conversationHistory.map(({ role, content }) => ({
      role,
      content,
    }));

    // AbortSignal.timeout() は Hermes エンジン未実装のため AbortController で代替する
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 30000);

    try {
      const { data, error } = await this.client.POST('/ai/chat', {
        // x-api-key は OpenAPI spec で required header として定義されているため明示的に渡す
        params: {
          header: { 'x-api-key': this.apiKey },
        },
        body: {
          message,
          workoutHistory,
          conversationHistory: conversationForAPI,
        },
        // TODO: ストリーミング対応時は fetch オプションで ReadableStream を使用
        signal: controller.signal,
      });

      if (error) {
        // openapi-fetch が 4xx/5xx を error として返す
        const apiError = error as { error?: string; code?: string };
        const code = apiError.code ?? '';

        if (code === 'UNAUTHORIZED') {
          throw new Error('認証エラーが発生しました。アプリを再起動してください。');
        }
        throw new Error(
          apiError.error ?? `AIサービスでエラーが発生しました。`,
        );
      }

      return { content: data.message };
    } finally {
      // 正常終了・エラー問わずタイマーをクリアしてリソースリークを防ぐ
      clearTimeout(timeoutId);
    }
  }
}
