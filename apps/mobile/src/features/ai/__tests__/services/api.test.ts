/**
 * APIAIService のテスト
 *
 * openapi-fetch は内部で fetch() を Request オブジェクト形式で呼び出す。
 * global.fetch をモックして HTTP 呼び出しの動作を検証する。
 */
import { APIAIService } from '../../services/api';
import type { ChatMessage, WorkoutHistoryContext } from '../../types/index';

// openapi-fetch が内部で使う fetch をモック
// openapi-fetch は `new Request(url, options)` を作って `fetch(request)` を呼ぶため、
// モックの引数は Request オブジェクトになる
const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE_URL = 'https://api.example.com';
const API_KEY = 'test-key';

const emptyHistory: ChatMessage[] = [];
const emptyWorkoutHistory: WorkoutHistoryContext = {
  strategy: 'recent_months',
  data: [],
};

/** fetch モックのレスポンスを設定するヘルパー */
function mockResponse(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('APIAIService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('正常レスポンスで content が返ること', async () => {
    mockResponse(200, { message: 'AIの返答' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    const result = await service.chat({
      message: 'テスト',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });

    expect(result.content).toBe('AIの返答');
  });

  it('X-API-Key ヘッダーが付与されること', async () => {
    mockResponse(200, { message: 'ok' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await service.chat({
      message: 'test',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });

    // raw fetch(url, options) 形式で呼ぶため、第2引数の headers を確認する
    const options = mockFetch.mock.calls[0]![1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe(API_KEY);
  });

  it('401 レスポンスで認証エラーが throw されること', async () => {
    mockResponse(401, { error: 'Unauthorized', code: 'UNAUTHORIZED' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await expect(
      service.chat({
        message: 'test',
        conversationHistory: emptyHistory,
        workoutHistory: emptyWorkoutHistory,
      }),
    ).rejects.toThrow(/認証エラー/);
  });

  it('500 レスポンスでエラーが throw されること', async () => {
    mockResponse(500, { error: 'Internal Server Error', code: 'INTERNAL_ERROR' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await expect(
      service.chat({
        message: 'test',
        conversationHistory: emptyHistory,
        workoutHistory: emptyWorkoutHistory,
      }),
    ).rejects.toThrow();
  });

  it('Hermes 環境（AbortSignal.timeout が undefined）でも動作すること', async () => {
    // Hermes では AbortSignal.timeout スタティックメソッドが存在しない
    const originalTimeout = AbortSignal.timeout;
    // @ts-expect-error Hermes シミュレーション: timeout を undefined に差し替え
    AbortSignal.timeout = undefined;

    mockResponse(200, { message: 'ok' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await expect(
      service.chat({
        message: 'test',
        conversationHistory: emptyHistory,
        workoutHistory: emptyWorkoutHistory,
      }),
    ).resolves.toEqual({ content: 'ok' });

    AbortSignal.timeout = originalTimeout;
  });

  it('ネットワークエラーが適切にハンドリングされること', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await expect(
      service.chat({
        message: 'test',
        conversationHistory: emptyHistory,
        workoutHistory: emptyWorkoutHistory,
      }),
    ).rejects.toThrow();
  });

  it('正しいエンドポイント URL にリクエストされること', async () => {
    mockResponse(200, { message: 'ok' });

    const service = new APIAIService({ baseUrl: BASE_URL, apiKey: API_KEY });
    await service.chat({
      message: 'test',
      conversationHistory: emptyHistory,
      workoutHistory: emptyWorkoutHistory,
    });

    // raw fetch(url, options) 形式なので第1引数が URL 文字列
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/ai/chat');
  });
});
