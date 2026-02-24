/**
 * AI サービスファクトリ
 *
 * 環境変数 EXPO_PUBLIC_USE_MOCK_AI（または開発環境デフォルト）で
 * MockAIService と APIAIService を切り替える。
 */
import type { IAIService } from '../types/index';
import { APIAIService } from './api';
import { MockAIService } from './mock';

export type { IAIService };

/**
 * AI サービスのシングルトンインスタンスを生成する
 *
 * 本番切り替え時は以下の環境変数を設定する:
 *   EXPO_PUBLIC_USE_MOCK_AI=false
 *   EXPO_PUBLIC_API_BASE_URL=https://xxxx.execute-api.ap-northeast-1.amazonaws.com
 *   EXPO_PUBLIC_API_KEY=your-api-key
 */
export function createAIService(): IAIService {
  const useMock = process.env['EXPO_PUBLIC_USE_MOCK_AI'] !== 'false';

  if (useMock) {
    return new MockAIService();
  }

  const baseUrl = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '';
  const apiKey = process.env['EXPO_PUBLIC_API_KEY'] ?? '';

  if (!baseUrl || !apiKey) {
    console.warn(
      '[AIService] EXPO_PUBLIC_API_BASE_URL または EXPO_PUBLIC_API_KEY が未設定です。MockAIService にフォールバックします。',
    );
    return new MockAIService();
  }

  return new APIAIService({ baseUrl, apiKey });
}
