/**
 * AI チャット機能の型定義
 */

/** チャットメッセージ */
export type ChatMessage = {
  /** ユニークID（ulid 推奨） */
  id: string;
  /** 送信者ロール */
  role: 'user' | 'assistant';
  /** メッセージ本文 */
  content: string;
  /** 作成日時（UNIXミリ秒） */
  createdAt: number;
};

/** クイックアクション */
export type QuickAction = {
  /** 識別子 */
  id: string;
  /** UI に表示するラベル */
  label: string;
  /** AI に送信するプロンプト */
  prompt: string;
};

/** ワークアウト履歴コンテキスト（Lambda 側の型と対応） */
export type WorkoutHistoryContext = {
  strategy: 'recent_months' | 'exercise_specific' | 'date_range';
  data: WorkoutSummary[];
};

/** ワークアウトサマリー */
export type WorkoutSummary = {
  date: string;
  exercises: {
    name: string;
    muscleGroup: string;
    sets: { weight: number | null; reps: number | null }[];
  }[];
  memo: string | null;
};

/** 会話メッセージ（Lambda 送信用） */
export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * AI サービスインターフェース
 *
 * MockAIService（開発）と APIAIService（本番）の共通インターフェース。
 * 環境変数でファクトリ関数が切り替える。
 *
 * 将来のストリーミング対応:
 *   stream(params: ChatParams): AsyncIterable<string>
 *   ← packages/api の InvokeModelWithResponseStream 実装後に追加
 */
export interface IAIService {
  chat(params: {
    message: string;
    conversationHistory: ChatMessage[];
    workoutHistory: WorkoutHistoryContext;
  }): Promise<{ content: string }>;
}

/**
 * デフォルトのクイックアクション定義
 * ユーザーが1タップで送信できる定型プロンプト
 */
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'review',
    label: '今回を振り返る',
    prompt:
      '今回のワークアウトを振り返って、良かった点と次回への改善点を教えてください。',
  },
  {
    id: 'next',
    label: '次を提案して',
    prompt:
      '私のトレーニング履歴を踏まえて、次回のメニューを具体的に提案してください。',
  },
  {
    id: 'goal',
    label: '目標への道筋',
    prompt:
      '目標達成に向けて、今後のトレーニング計画と注意すべきポイントを教えてください。',
  },
];
