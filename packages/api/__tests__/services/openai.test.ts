/**
 * OpenAI サービスのテスト
 *
 * OpenAI SDK の chat.completions.create() を vi.spyOn でモック化する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';
import { invokeModel, buildSystemPrompt } from '../../src/services/openai.js';

describe('buildSystemPrompt', () => {
  it('historyText が空のときベースプロンプトのみ返すこと', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).not.toContain('直近');
  });

  it('historyText がある場合プロンプトに含まれること', () => {
    const prompt = buildSystemPrompt('【直近のトレーニング履歴】\n## 2026-02-20');
    expect(prompt).toContain('直近');
  });
});

describe('invokeModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('正常レスポンスから text が抽出されること', async () => {
    const mockClient = new OpenAI({ apiKey: 'test-key' });
    vi.spyOn(mockClient.chat.completions, 'create').mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'AIの返答' } }],
    } as never);

    const result = await invokeModel(mockClient, 'システム', [], 'ユーザー');
    expect(result.text).toBe('AIの返答');
  });

  it('会話履歴がシステムプロンプトの直後に含まれること', async () => {
    const mockClient = new OpenAI({ apiKey: 'test-key' });
    const spy = vi.spyOn(mockClient.chat.completions, 'create').mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    } as never);

    const history = [{ role: 'user' as const, content: '前の質問' }];
    await invokeModel(mockClient, 'system', history, '今の質問');

    const calledMessages = (spy.mock.calls[0]![0] as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).messages;
    expect(calledMessages[0]).toMatchObject({ role: 'system', content: 'system' });
    expect(calledMessages[1]).toMatchObject({ role: 'user', content: '前の質問' });
    expect(calledMessages[2]).toMatchObject({ role: 'user', content: '今の質問' });
  });

  it('OpenAI エラー時に BEDROCK_ERROR が throw されること', async () => {
    const mockClient = new OpenAI({ apiKey: 'test-key' });
    vi.spyOn(mockClient.chat.completions, 'create').mockRejectedValueOnce(
      new Error('api error'),
    );

    await expect(invokeModel(mockClient, 'system', [], 'msg'))
      .rejects.toMatchObject({ code: 'BEDROCK_ERROR' });
  });
});
