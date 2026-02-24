/**
 * ChatInput コンポーネント
 *
 * チャット画面下部に固定する入力エリア。
 * TextInput（最大4行・1000文字）と送信ボタン（Ionicons send アイコン）で構成。
 * 空文字時は送信ボタンを opacity 0.4 で無効化する。
 * 送信後はテキストを自動クリアする。
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { colors } from '@/shared/constants/colors';

type ChatInputProps = {
  /** テキスト送信時のコールバック（空文字は呼ばれない） */
  onSend: (text: string) => void;
  /** true にすると入力・送信を両方無効化する */
  disabled: boolean;
};

/**
 * チャット入力コンポーネント
 *
 * 送信可否の判定: テキストが空白のみ or disabled → ボタン無効
 * 送信後クリア: onSend 呼び出し後に setText('') でリセット
 */
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');

  // 空白のみの入力は送信不可と判定する
  const canSend = !disabled && text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    // 送信後はテキストをクリアしてユーザーが次の入力に集中できるようにする
    setText('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      {/* テキスト入力: pill 形状、最大4行、1000文字上限 */}
      <TextInput
        testID="chat-input-text"
        value={text}
        onChangeText={setText}
        editable={!disabled}
        multiline
        numberOfLines={4}
        maxLength={1000}
        placeholder="メッセージを入力..."
        placeholderTextColor={colors.textSecondary}
        style={{
          flex: 1,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 15,
          color: colors.textPrimary,
          backgroundColor: colors.background,
          // multiline の場合、Android で最大高さを制御するため maxHeight を設定
          maxHeight: 120,
        }}
      />
      {/* 送信ボタン: 空文字 or disabled 時は opacity 0.4 で視覚的に無効化 */}
      <TouchableOpacity
        testID="chat-send-button"
        onPress={handleSend}
        disabled={!canSend}
        accessibilityState={{ disabled: !canSend }}
        style={{
          marginLeft: 8,
          paddingVertical: 10,
          paddingHorizontal: 4,
          opacity: canSend ? 1 : 0.4,
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="send" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}
