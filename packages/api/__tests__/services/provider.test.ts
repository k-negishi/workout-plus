import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * createAIProvider ファクトリーのテスト
 *
 * AI_PROVIDER 環境変数で実装を切り替えられることを検証する。
 * 各プロバイダーの詳細な動作は個別のテスト（openai.test.ts 等）で検証する。
 */

describe('createAIProvider', () => {
  const originalEnv = process.env['AI_PROVIDER'];

  afterEach(() => {
    vi.resetModules();
    if (originalEnv === undefined) {
      delete process.env['AI_PROVIDER'];
    } else {
      process.env['AI_PROVIDER'] = originalEnv;
    }
  });

  it('AI_PROVIDER 未設定のとき OpenAIProvider を返すこと', async () => {
    delete process.env['AI_PROVIDER'];
    const { createAIProvider } = await import('../../src/services/provider.js');
    const provider = createAIProvider();
    expect(typeof provider.invoke).toBe('function');
  });

  it('AI_PROVIDER=openai のとき OpenAIProvider を返すこと', async () => {
    process.env['AI_PROVIDER'] = 'openai';
    const { createAIProvider } = await import('../../src/services/provider.js');
    const provider = createAIProvider();
    expect(typeof provider.invoke).toBe('function');
  });

  it('未知の AI_PROVIDER を指定したときエラーを throw すること', async () => {
    process.env['AI_PROVIDER'] = 'unknown-provider';
    const { createAIProvider } = await import('../../src/services/provider.js');
    expect(() => createAIProvider()).toThrow(/unknown-provider/i);
  });
});
