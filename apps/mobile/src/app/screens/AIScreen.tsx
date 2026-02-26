/**
 * AI アシスタント画面
 *
 * MockAIService（開発時）または APIAIService（本番）を透過的に利用し、
 * チャット形式でトレーニングアドバイスを提供する。
 *
 * 構成:
 *   - ヘッダー（タイトルのみ、シンプルフラット）
 *   - QuickActionChips（定型プロンプトショートカット）
 *   - FlatList（メッセージ一覧、最新メッセージに自動スクロール）
 *   - TypingIndicator（AI 応答待ち中のみ表示）
 *   - ChatInput（テキスト入力 + 送信ボタン、キーボード対応）
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/constants/colors';

import { ChatInput } from '../../features/ai/components/ChatInput';
import { MessageBubble } from '../../features/ai/components/MessageBubble';
import { QuickActionChips } from '../../features/ai/components/QuickActionChips';
import { useAIChat } from '../../features/ai/hooks/useAIChat';
import { createAIService } from '../../features/ai/services/index';
import {
  type ChatMessage,
  DEFAULT_QUICK_ACTIONS,
  type QuickAction,
} from '../../features/ai/types/index';

/**
 * AI 応答待ち中に表示するインジケーター
 *
 * シンプルな「考え中...」テキスト表示。
 * 将来的に Animated API でドットアニメーションに置き換え可能。
 */
function TypingIndicator() {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.neutralBg,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginVertical: 4,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>考え中...</Text>
    </View>
  );
}

/**
 * AI アシスタント画面コンポーネント
 */
export function AIScreen() {
  const insets = useSafeAreaInsets();

  // useMemo で AI サービスをコンポーネントのライフサイクルに束縛する。
  // モジュールスコープのシングルトンより安全で、テスト時のモック差し替えにも対応できる。
  // 依存配列を空にすることで、マウント時に1度だけ生成してそれ以降はキャッシュする。
  const service = useMemo(() => createAIService(), []);

  const { messages, isLoading, sendMessage, sendQuickAction } = useAIChat(service);

  // 最新メッセージへの自動スクロール用 ref
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  /**
   * メッセージリストの末尾（最新メッセージ）にスクロールする。
   * FlatList の onContentSizeChange で呼び出すことで、
   * 新しいメッセージが追加されるたびに自動的に末尾へ移動する。
   */
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage],
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      void sendQuickAction(action);
    },
    [sendQuickAction],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <MessageBubble message={item} />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    // KeyboardAvoidingView: iOS は 'padding'、Android は 'height' で挙動が異なるため分岐
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        {/* ヘッダー: 他画面と統一（中央揃え・fontSize 17・#334155）Issue #168 */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.white,
          }}
        >
          <Text
            testID="ai-header-title"
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: '#334155',
              textAlign: 'center',
            }}
          >
            AI アシスタント
          </Text>
        </View>

        {/* クイックアクションチップ: AI ローディング中は無効化 */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.white,
          }}
        >
          <QuickActionChips
            actions={DEFAULT_QUICK_ACTIONS}
            onPress={handleQuickAction}
            disabled={isLoading}
          />
        </View>

        {/* メッセージ一覧: 新しいメッセージが追加されるたびに末尾へスクロール */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          onContentSizeChange={scrollToBottom}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          // パフォーマンス最適化: チャットは常に末尾が最新なので逆順にしない
          keyboardShouldPersistTaps="handled"
        />

        {/* AI 応答待ちインジケーター: isLoading 中のみ表示 */}
        {isLoading && <TypingIndicator />}

        {/* チャット入力エリア: AI ローディング中は無効化 */}
        {/* BottomTab 配下のため insets.bottom は TabBar が吸収する。ここでは不要（Issue #185） */}
        <View testID="chat-input-wrapper">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
