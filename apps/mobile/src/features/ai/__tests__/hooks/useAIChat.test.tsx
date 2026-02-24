import { act,renderHook } from '@testing-library/react-native';

import { useAIChat } from '../../hooks/useAIChat';
import type { IAIService } from '../../types/index';

/**
 * useAIChat フックのテスト
 */
describe('useAIChat', () => {
  // テスト用モックサービス
  const createMockService = (response = { content: 'AIの返答' }): IAIService => ({
    chat: jest.fn().mockResolvedValue(response),
  });

  it('初期状態でウェルカムメッセージが含まれること', () => {
    const { result } = renderHook(() => useAIChat(createMockService()));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]!.role).toBe('assistant');
  });

  it('sendMessage でユーザーメッセージとアシスタントメッセージが追加されること', async () => {
    const { result } = renderHook(() => useAIChat(createMockService()));

    await act(async () => {
      await result.current.sendMessage('テスト送信');
    });

    // ウェルカム + ユーザー + アシスタント = 3件
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[1]!.role).toBe('user');
    expect(result.current.messages[1]!.content).toBe('テスト送信');
    expect(result.current.messages[2]!.role).toBe('assistant');
    expect(result.current.messages[2]!.content).toBe('AIの返答');
  });

  it('送信中は isLoading が true になること', async () => {
    let resolveChat!: () => void;
    const service: IAIService = {
      chat: jest.fn().mockReturnValue(
        new Promise<{ content: string }>((resolve) => {
          resolveChat = () => resolve({ content: 'ok' });
        })
      ),
    };

    const { result } = renderHook(() => useAIChat(service));

    act(() => {
      void result.current.sendMessage('test');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveChat();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('エラー時にエラーメッセージがアシスタントバブルとして追加されること', async () => {
    const service: IAIService = {
      chat: jest.fn().mockRejectedValue(new Error('ネットワークエラー')),
    };

    const { result } = renderHook(() => useAIChat(service));

    await act(async () => {
      await result.current.sendMessage('test');
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1]!;
    expect(lastMessage.role).toBe('assistant');
    expect(lastMessage.content).toContain('エラー');
  });

  it('空文字の sendMessage が no-op であること', async () => {
    const service = createMockService();
    const { result } = renderHook(() => useAIChat(service));

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(service.chat).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1); // ウェルカムのみ
  });

  it('isLoading 中の sendMessage が no-op であること', async () => {
    let resolveChat!: () => void;
    const service: IAIService = {
      chat: jest.fn().mockReturnValue(
        new Promise<{ content: string }>((resolve) => {
          resolveChat = () => resolve({ content: 'ok' });
        })
      ),
    };

    const { result } = renderHook(() => useAIChat(service));

    act(() => {
      void result.current.sendMessage('first');
    });

    // ローディング中に再送信
    await act(async () => {
      await result.current.sendMessage('second');
    });

    // 1回しか呼ばれないこと
    expect(service.chat).toHaveBeenCalledTimes(1);

    await act(async () => { resolveChat(); });
  });

  it('sendMessage 後に isLoading が false に戻ること', async () => {
    const service = createMockService({ content: '返答' });
    const { result } = renderHook(() => useAIChat(service));

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
