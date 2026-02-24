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
 * IAIService インターフェースを実装しているため MockAIService と透過的に差し替え可能。
 *
 * openapi-fetch を使わず raw fetch を使う理由:
 *   openapi-fetch は内部で new Request() → fetch(Request) のパターンを使うが、
 *   React Native / Hermes では fetch(Request) の挙動が不安定なため
 *   fetch(url, options) の形式で直接呼び出す。
 *
 * TODO: 将来対応
 *   - ストリーミング: ReadableStream で SSE を受信する（packages/api が SSE 対応後）
 *   - 認証: X-API-Key → Cognito JWT（Issue #11 完了後）
 */
export class APIAIService implements IAIService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: APIAIServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
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

    // AbortSignal.timeout() は Hermes 未実装のため AbortController で代替する
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 30000);

    try {
      const response = await fetch(`${this.baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          message,
          workoutHistory,
          conversationHistory: conversationForAPI,
        }),
        // TODO: ストリーミング対応時は fetch オプションで ReadableStream を使用
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string; code?: string };
        const code = errorData.code ?? '';

        if (code === 'UNAUTHORIZED') {
          throw new Error('認証エラーが発生しました。アプリを再起動してください。');
        }
        throw new Error(errorData.error ?? 'AIサービスでエラーが発生しました。');
      }

      const data = await response.json() as { message: string };
      return { content: data.message };
    } finally {
      // 正常終了・エラー問わずタイマーをクリアしてリソースリークを防ぐ
      clearTimeout(timeoutId);
    }
  }
}
