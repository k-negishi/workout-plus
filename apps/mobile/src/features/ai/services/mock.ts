import type { ChatMessage, IAIService, WorkoutHistoryContext } from '../types/index';

/**
 * MockAIService
 *
 * 開発・テスト用のモック AI サービス実装。
 * 実際の Bedrock 呼び出しを行わず、固定レスポンスを返す。
 * IAIService インターフェースを実装しているため、APIAIService と透過的に差し替え可能。
 */
export class MockAIService implements IAIService {
  async chat(params: {
    message: string;
    conversationHistory: ChatMessage[];
    workoutHistory: WorkoutHistoryContext;
  }): Promise<{ content: string }> {
    // 実際の API 遅延を模倣（UX 確認のため）
    await new Promise((resolve) => setTimeout(resolve, 800));

    const content = this.generateResponse(params.message);
    return { content };
  }

  /**
   * メッセージの内容に応じてレスポンスを分岐する
   */
  private generateResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('振り返') || lowerMessage.includes('review')) {
      return '今回のワークアウトお疲れ様でした！記録を確認しました。全体的に安定したパフォーマンスを発揮できていますね。特にコンパウンド種目の重量が着実に伸びています。次回はインターバルを少し短くしてみると、心肺機能の向上にもつながります。';
    }

    if (
      lowerMessage.includes('提案') ||
      lowerMessage.includes('メニュー') ||
      lowerMessage.includes('next')
    ) {
      return '履歴を分析した結果、次回のトレーニングとして以下を提案します：\n\n1. **ベンチプレス** 4セット×6-8レップ（前回より2.5kg増）\n2. **インクラインダンベルフライ** 3セット×12レップ\n3. **ケーブルクロスオーバー** 3セット×15レップ\n\n胸筋の疲労が蓄積しているため、次回は背中や脚を中心にすることも検討してください。';
    }

    if (lowerMessage.includes('目標') || lowerMessage.includes('goal')) {
      return '現在のペースで継続すれば、3ヶ月後に目標体重に近づける見込みです。特に週3回以上のトレーニングを維持し、タンパク質の摂取量（体重×2g）を意識すると効果的です。また、睡眠の質を上げることでリカバリーが改善されます。';
    }

    return 'ご質問ありがとうございます。トレーニングについて何でもお聞きします。メニュー提案、フォームチェック、栄養アドバイスなど、お気軽にどうぞ！';
  }
}
