/**
 * ChatInput コンポーネントテスト
 *
 * - テキスト入力と送信ボタンのUIを検証
 * - 送信後のテキストクリアを検証
 * - 空文字・disabled 時の動作を検証
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// Ionicons のモック（ネイティブアイコンライブラリをテスト環境で代替）
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { ChatInput } from '../../components/ChatInput';

describe('ChatInput', () => {
  it('TextInput が表示されること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    expect(screen.getByTestId('chat-input-text')).toBeTruthy();
  });

  it('送信ボタンが表示されること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    expect(screen.getByTestId('chat-send-button')).toBeTruthy();
  });

  it('テキストを入力して送信するとonSendが入力テキストで呼ばれること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    const input = screen.getByTestId('chat-input-text');
    fireEvent.changeText(input, 'こんにちは');
    fireEvent.press(screen.getByTestId('chat-send-button'));
    expect(onSend).toHaveBeenCalledWith('こんにちは');
  });

  it('送信後にテキストがクリアされること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    const input = screen.getByTestId('chat-input-text');
    fireEvent.changeText(input, '送信テキスト');
    fireEvent.press(screen.getByTestId('chat-send-button'));
    expect(input.props.value).toBe('');
  });

  it('空文字の場合は送信ボタンがdisabledになること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    const button = screen.getByTestId('chat-send-button');
    // 空文字 = ボタンが無効（disabled props か opacity で判定）
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('テキスト入力後に送信ボタンが有効になること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    const input = screen.getByTestId('chat-input-text');
    fireEvent.changeText(input, 'テキスト');
    const button = screen.getByTestId('chat-send-button');
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('空文字のまま送信しても onSend が呼ばれないこと', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    fireEvent.press(screen.getByTestId('chat-send-button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disabled=true 時にテキスト入力が無効化されること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={true} />);
    const input = screen.getByTestId('chat-input-text');
    expect(input.props.editable).toBe(false);
  });

  it('disabled=true 時に送信ボタンが無効化されること', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={true} />);
    const button = screen.getByTestId('chat-send-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true で送信ボタンを押しても onSend が呼ばれないこと', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled={true} />);
    const input = screen.getByTestId('chat-input-text');
    // disabled 中でもテキストを設定してボタンを押してみる
    fireEvent.changeText(input, 'テスト');
    fireEvent.press(screen.getByTestId('chat-send-button'));
    expect(onSend).not.toHaveBeenCalled();
  });
});
