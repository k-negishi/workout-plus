import type { WorkoutHistoryContext } from '../../schemas.js';
import type { WorkoutHistoryStrategy } from './interface.js';

/**
 * 直近 N ヶ月のワークアウト履歴をプロンプトテキストに変換する戦略
 *
 * mobile 側から送られた WorkoutHistoryContext.data を日付昇順に並び替え、
 * Claude が理解しやすいマークダウン風のテキストに整形する。
 */
export class RecentMonthsStrategy implements WorkoutHistoryStrategy {
  buildPromptText(context: WorkoutHistoryContext): string {
    if (context.data.length === 0) return '';

    const sorted = [...context.data].sort((a, b) => a.date.localeCompare(b.date));
    const lines: string[] = ['【直近のトレーニング履歴】'];

    for (const workout of sorted) {
      lines.push(`\n## ${workout.date}`);
      if (workout.exercises.length === 0) {
        lines.push('（種目記録なし）');
        continue;
      }
      for (const ex of workout.exercises) {
        lines.push(`- ${ex.name}（${ex.muscleGroup}）`);
        ex.sets.forEach((s, i) => {
          const w = s.weight !== null ? `${s.weight}kg` : '重量なし';
          const r = s.reps !== null ? `${s.reps}回` : 'レップなし';
          lines.push(`  セット${i + 1}: ${w} × ${r}`);
        });
      }
      if (workout.memo) lines.push(`  メモ: ${workout.memo}`);
    }

    return lines.join('\n');
  }
}
