import { beforeEach,describe, expect, it, vi } from 'vitest';

// provider.ts をモックして invoke を差し替える
// これにより OpenAI クライアントを使わずにルートの動作を検証できる
vi.mock('../../../src/services/provider.js', () => ({
  createAIProvider: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ text: 'AI からの返答' }),
  })),
}));

import { testClient } from 'hono/testing';

import { createApp } from '../../../src/app.js';

describe('POST /ai/chat', () => {
  const API_KEY = 'test-api-key';

  beforeEach(() => {
    process.env['API_KEY_SECRET'] = API_KEY;
    vi.clearAllMocks();
  });

  const validBody = {
    message: 'テストメッセージ',
    workoutHistory: { strategy: 'recent_months' as const, data: [] },
    conversationHistory: [],
  };

  it('正しい API Key で 200 と ChatResponse が返ること', async () => {
    const app = createApp();
    const client = testClient(app);
    const res = await client.ai.chat.$post(
      { json: validBody },
      { headers: { 'X-API-Key': API_KEY } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('AI からの返答');
  });

  it('API Key なしで 401 が返ること', async () => {
    const app = createApp();
    const client = testClient(app);
    const res = await client.ai.chat.$post({ json: validBody });
    expect(res.status).toBe(401);
  });

  it('message が空で 400 が返ること', async () => {
    const app = createApp();
    const client = testClient(app);
    const res = await client.ai.chat.$post(
      { json: { ...validBody, message: '' } },
      { headers: { 'X-API-Key': API_KEY } },
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('200 と status: ok が返ること', async () => {
    const app = createApp();
    const client = testClient(app);
    const res = await client.health.$get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
