import { useCallback, useState } from 'react';

import type { ChatMessage, IAIService, QuickAction, WorkoutHistoryContext } from '../types/index';

/** useAIChat フックの戻り値 */
type UseAIChatReturn = {
  /** 会話メッセージ一覧（ウェルカムメッセージを含む） */
  messages: ChatMessage[];
  /** AI 応答待ち中フラグ */
  isLoading: boolean;
  /** テキストメッセージを送信する */
  sendMessage: (text: string) => Promise<void>;
  /** クイックアクションのプロンプトを送信する */
  sendQuickAction: (action: QuickAction) => Promise<void>;
};

/** ウェルカムメッセージ */
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'こんにちは！トレーニングについて何でも聞いてください。メニュー提案、振り返り、目標達成のアドバイスなど対応できます。',
  createdAt: Date.now(),
};

/**
 * ワークアウト履歴コンテキストを構築するヘルパー
 *
 * 現在は空の履歴を返す。
 * TODO: SQLite から直近3ヶ月のデータを取得して WorkoutHistoryContext を構築する
 *       WorkoutHistoryStrategy パターンに移行時に実装する
 */
async function buildWorkoutHistoryContext(): Promise<WorkoutHistoryContext> {
  return { strategy: 'recent_months', data: [] };
}

/**
 * AI チャットの状態管理フック
 *
 * IAIService インターフェースを受け取るため、
 * MockAIService と APIAIService を透過的に差し替え可能。
 */
export function useAIChat(service: IAIService): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      // 空白のみのメッセージや送信中は no-op
      if (!text.trim() || isLoading) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: text.trim(),
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const workoutHistory = await buildWorkoutHistoryContext();

        // コンテキスト用に現在の会話履歴を取得（setMessages の外なので state から直接読む）
        // NOTE: このクロージャは sendMessage 呼び出し時点の messages を参照するため、
        //       userMessage 追加後の状態は含まれない。Lambda 側でユーザーメッセージを追加するため問題なし。
        // IAIService は ChatMessage[] を受け取り、実装側（APIAIService）が API フォーマットへ変換する。

        const result = await service.chat({
          message: text.trim(),
          conversationHistory: messages,
          workoutHistory,
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: result.content,
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        // エラーをアシスタントのバブルとして表示する（UX: サイレントリターン禁止）
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content:
            error instanceof Error
              ? `エラーが発生しました: ${error.message}`
              : '予期せぬエラーが発生しました。もう一度お試しください。',
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, service],
  );

  const sendQuickAction = useCallback(
    async (action: QuickAction) => {
      await sendMessage(action.prompt);
    },
    [sendMessage],
  );

  return {
    messages,
    isLoading,
    sendMessage,
    sendQuickAction,
  };
}
