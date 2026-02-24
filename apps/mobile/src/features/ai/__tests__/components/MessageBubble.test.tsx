/**
 * MessageBubble コンポーネントテスト
 *
 * - ユーザーメッセージ: 右寄せ・青背景・白テキスト
 * - アシスタントメッセージ: 左寄せ・グレー背景・ダークテキスト
 * - 角丸: ロール別に非対称な border-radius
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { MessageBubble } from '../../components/MessageBubble';
import type { ChatMessage } from '../../types/index';

/** テスト用ユーザーメッセージ */
const userMessage: ChatMessage = {
  id: 'msg-user-1',
  role: 'user',
  content: 'テストメッセージ',
  createdAt: 1000000,
};

/** テスト用アシスタントメッセージ */
const assistantMessage: ChatMessage = {
  id: 'msg-assistant-1',
  role: 'assistant',
  content: 'AIの返答メッセージ',
  createdAt: 1000001,
};

describe('MessageBubble', () => {
  describe('ユーザーメッセージ', () => {
    it('メッセージ本文が表示されること', () => {
      render(<MessageBubble message={userMessage} />);
      expect(screen.getByText('テストメッセージ')).toBeTruthy();
    });

    it('右寄せ（alignSelf: flex-end）のスタイルが適用されること', () => {
      render(<MessageBubble message={userMessage} />);
      // メッセージコンテナが右寄せになっていることを検証
      const bubble = screen.getByTestId('message-bubble-container');
      expect(bubble.props.style).toMatchObject(expect.objectContaining({ alignSelf: 'flex-end' }));
    });

    it('青背景（#4D94FF）のスタイルが適用されること', () => {
      render(<MessageBubble message={userMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      // 配列スタイルの場合も含めて背景色を検証
      const flatStyle = Array.isArray(bubble.props.style)
        ? Object.assign({}, ...bubble.props.style)
        : bubble.props.style;
      expect(flatStyle.backgroundColor).toBe('#4D94FF');
    });

    it('テキストが白（#FFFFFF）で表示されること', () => {
      render(<MessageBubble message={userMessage} />);
      const text = screen.getByText('テストメッセージ');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('ユーザー用の角丸（右下4）が適用されること', () => {
      render(<MessageBubble message={userMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      const flatStyle = Array.isArray(bubble.props.style)
        ? Object.assign({}, ...bubble.props.style)
        : bubble.props.style;
      expect(flatStyle.borderBottomRightRadius).toBe(4);
    });

    it('最大幅80%のスタイルが適用されること', () => {
      render(<MessageBubble message={userMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      const flatStyle = Array.isArray(bubble.props.style)
        ? Object.assign({}, ...bubble.props.style)
        : bubble.props.style;
      expect(flatStyle.maxWidth).toBe('80%');
    });
  });

  describe('アシスタントメッセージ', () => {
    it('メッセージ本文が表示されること', () => {
      render(<MessageBubble message={assistantMessage} />);
      expect(screen.getByText('AIの返答メッセージ')).toBeTruthy();
    });

    it('左寄せ（alignSelf: flex-start）のスタイルが適用されること', () => {
      render(<MessageBubble message={assistantMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({ alignSelf: 'flex-start' }),
      );
    });

    it('グレー背景（#F1F5F9）のスタイルが適用されること', () => {
      render(<MessageBubble message={assistantMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      const flatStyle = Array.isArray(bubble.props.style)
        ? Object.assign({}, ...bubble.props.style)
        : bubble.props.style;
      expect(flatStyle.backgroundColor).toBe('#F1F5F9');
    });

    it('テキストが#475569で表示されること', () => {
      render(<MessageBubble message={assistantMessage} />);
      const text = screen.getByText('AIの返答メッセージ');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;
      expect(flatStyle.color).toBe('#475569');
    });

    it('アシスタント用の角丸（左下4）が適用されること', () => {
      render(<MessageBubble message={assistantMessage} />);
      const bubble = screen.getByTestId('message-bubble-container');
      const flatStyle = Array.isArray(bubble.props.style)
        ? Object.assign({}, ...bubble.props.style)
        : bubble.props.style;
      expect(flatStyle.borderBottomLeftRadius).toBe(4);
    });
  });
});
