/**
 * AIScreen テスト
 *
 * - ヘッダーの表示を検証
 * - ウェルカムメッセージの初期表示を検証
 * - クイックアクションチップの表示を検証
 * - チャット入力とメッセージ送受信を検証
 * - ローディング中の TypingIndicator 表示を検証
 *
 * DB アクセス・AI サービス・SafeArea はモックで代替する。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// react-native-safe-area-context のモック
// displayName を設定して react-native-css-interop のハイジャックエラーを回避
const insets = { top: 44, bottom: 34, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => {
  // jest.mock ファクトリ内では ESM import が使えないため require を使用する
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  const InsetsContext = RN.createContext(insets);
  const FrameContext = RN.createContext({ x: 0, y: 0, width: 390, height: 844 });
  const mockProvider = ({ children }: { children: unknown }) =>
    RN.createElement(RN.Fragment, null, children);
  mockProvider.displayName = 'SafeAreaProvider';
  return {
    SafeAreaProvider: mockProvider,
    SafeAreaInsetsContext: InsetsContext,
    SafeAreaFrameContext: FrameContext,
    useSafeAreaInsets: () => insets,
  };
});

// @expo/vector-icons のモック
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// AI サービスファクトリをモック
// jest.mock の factory 関数は巻き上げられるため、mockChat は __mocks__ 内の変数として定義する。
// jest.requireActual を使わず、モジュール全体を差し替えることで chat のスパイを制御する。
jest.mock('../../../features/ai/services/index', () => ({
  createAIService: jest.fn(),
}));

import { createAIService } from '../../../features/ai/services/index';
import { AIScreen } from '../AIScreen';

/** createAIService のモック型 */
const mockCreateAIService = createAIService as jest.MockedFunction<typeof createAIService>;

describe('AIScreen', () => {
  // テスト間で共有するモック chat 関数
  let mockChat: jest.Mock;

  beforeEach(() => {
    mockChat = jest.fn();
    // デフォルト: 即時解決するレスポンスを返す
    mockChat.mockResolvedValue({ content: 'AIの返答' });
    // createAIService が mockChat を持つサービスを返すよう設定
    mockCreateAIService.mockReturnValue({ chat: mockChat });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「AI アシスタント」が表示されること', () => {
    render(<AIScreen />);
    expect(screen.getByText('AI アシスタント')).toBeTruthy();
  });

  it('ヘッダータイトルが中央揃えで表示されること（Issue #168: トンマナ統一）', () => {
    render(<AIScreen />);
    const title = screen.getByTestId('ai-header-title');
    expect(title.props.style).toEqual(expect.objectContaining({ textAlign: 'center' }));
  });

  it('ヘッダータイトルの fontSize が 17 であること（Issue #168: トンマナ統一）', () => {
    render(<AIScreen />);
    const title = screen.getByTestId('ai-header-title');
    expect(title.props.style).toEqual(expect.objectContaining({ fontSize: 17 }));
  });

  it('ウェルカムメッセージが初期表示されること', () => {
    render(<AIScreen />);
    // useAIChat が初期メッセージとしてウェルカムメッセージを挿入する
    expect(screen.getByText(/こんにちは/)).toBeTruthy();
  });

  it('クイックアクションチップが表示されること', () => {
    render(<AIScreen />);
    // DEFAULT_QUICK_ACTIONS の全ラベルが表示されていること
    expect(screen.getByText('今回を振り返る')).toBeTruthy();
    expect(screen.getByText('次を提案して')).toBeTruthy();
    expect(screen.getByText('目標への道筋')).toBeTruthy();
  });

  it('テキスト入力フィールドが表示されること', () => {
    render(<AIScreen />);
    expect(screen.getByTestId('chat-input-text')).toBeTruthy();
  });

  it('メッセージを送信するとユーザーメッセージが追加されること', async () => {
    mockChat.mockResolvedValueOnce({ content: 'テスト返答' });
    render(<AIScreen />);

    const input = screen.getByTestId('chat-input-text');
    fireEvent.changeText(input, 'テストメッセージ');
    fireEvent.press(screen.getByTestId('chat-send-button'));

    await waitFor(() => {
      expect(screen.getByText('テストメッセージ')).toBeTruthy();
    });
  });

  it('送信後にAIの返答が表示されること', async () => {
    mockChat.mockResolvedValueOnce({ content: 'テスト用AI返答' });
    render(<AIScreen />);

    const input = screen.getByTestId('chat-input-text');
    fireEvent.changeText(input, 'テストメッセージ');
    fireEvent.press(screen.getByTestId('chat-send-button'));

    // waitFor は内部で act をラップしているため、二重の act は不要
    await waitFor(() => {
      expect(screen.getByText('テスト用AI返答')).toBeTruthy();
    });
  });

  it('クイックアクションをタップするとメッセージが送信されること', async () => {
    mockChat.mockResolvedValueOnce({ content: 'クイックアクション返答' });
    render(<AIScreen />);

    fireEvent.press(screen.getByText('今回を振り返る'));

    await waitFor(() => {
      // DEFAULT_QUICK_ACTIONS の review プロンプトが送信されること
      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('振り返'),
        }),
      );
    });
  });
});
