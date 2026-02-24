import type { WorkoutHistoryContext } from '../../schemas.js';

/**
 * ワークアウト履歴をシステムプロンプト用テキストに変換する戦略インターフェース
 *
 * TODO: 将来実装予定の戦略:
 *   - ExerciseSpecificStrategy
 *       特定の種目（例: ベンチプレス）の過去1年分のデータを渡す
 *       リクエストの workoutHistory.strategy === 'exercise_specific' で使用
 *   - DateRangeStrategy
 *       任意の期間（例: 2025-12-01〜2026-02-23）のデータを渡す
 *       リクエストの workoutHistory.strategy === 'date_range' で使用
 *
 * 追加手順:
 *   1. このインターフェースを実装したクラスを作成
 *   2. routes/ai/chat.ts の getStrategy() に case を追加
 */
export interface WorkoutHistoryStrategy {
  buildPromptText(context: WorkoutHistoryContext): string;
}
