/**
 * MessageBubble コンポーネント
 *
 * チャットメッセージを表示するバブルUI。
 * ユーザーメッセージは右寄せ・青背景、アシスタントは左寄せ・グレー背景。
 * 角丸を非対称にすることで「吹き出し」の自然な外観を実現する。
 */
import React from 'react';
import { Text, View } from 'react-native';

import type { ChatMessage } from '../types/index';

type MessageBubbleProps = {
  /** 表示するチャットメッセージ */
  message: ChatMessage;
};

/**
 * ユーザーメッセージのスタイル定数
 * 右下の角丸を小さくしてポインター的な外観にする
 */
const USER_BUBBLE_STYLE = {
  alignSelf: 'flex-end' as const,
  backgroundColor: '#4D94FF',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  borderBottomLeftRadius: 12,
  // 右下のみ小さく → 吹き出し感を演出
  borderBottomRightRadius: 4,
  paddingVertical: 12,
  paddingHorizontal: 16,
  maxWidth: '80%' as const,
};

/**
 * アシスタントメッセージのスタイル定数
 * 左下の角丸を小さくしてポインター的な外観にする
 */
const ASSISTANT_BUBBLE_STYLE = {
  alignSelf: 'flex-start' as const,
  backgroundColor: '#F1F5F9',
  borderTopLeftRadius: 4,
  // 左上のみ小さく → 吹き出し感を演出
  borderTopRightRadius: 12,
  borderBottomLeftRadius: 4,
  borderBottomRightRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
  maxWidth: '80%' as const,
};

const USER_TEXT_STYLE = {
  color: '#FFFFFF' as const,
  fontSize: 15,
  lineHeight: 22,
};

const ASSISTANT_TEXT_STYLE = {
  color: '#475569' as const,
  fontSize: 15,
  lineHeight: 22,
};

/**
 * チャットバブルコンポーネント
 *
 * role='user' → 右寄せ青バブル
 * role='assistant' → 左寄せグレーバブル
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View
      testID="message-bubble-container"
      style={isUser ? USER_BUBBLE_STYLE : ASSISTANT_BUBBLE_STYLE}
    >
      <Text style={isUser ? USER_TEXT_STYLE : ASSISTANT_TEXT_STYLE}>{message.content}</Text>
    </View>
  );
}
