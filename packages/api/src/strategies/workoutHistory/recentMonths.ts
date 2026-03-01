import type { WorkoutHistoryContext, WorkoutSummary } from '../../schemas.js';
import type { WorkoutHistoryStrategy } from './interface.js';

// セット情報を1行テキストに変換（cognitive-complexity 分散のためモジュールスコープに抽出）
function formatSet(index: number, weight: number | null, reps: number | null): string {
  const w = weight === null ? '重量なし' : `${weight}kg`;
  const r = reps === null ? 'レップなし' : `${reps}回`;
  return `  セット${index + 1}: ${w} × ${r}`;
}

// 1種目の行テキストリストを生成
function buildExerciseLines(ex: WorkoutSummary['exercises'][number]): string[] {
  const lines = [`- ${ex.name}（${ex.muscleGroup}）`];
  for (const [i, s] of ex.sets.entries()) {
    lines.push(formatSet(i, s.weight, s.reps));
  }
  return lines;
}

// 1ワークアウトの行テキストリストを生成
function buildWorkoutLines(workout: WorkoutSummary): string[] {
  const lines = [`\n## ${workout.date}`];
  if (workout.exercises.length === 0) {
    lines.push('（種目記録なし）');
    return lines;
  }
  for (const ex of workout.exercises) {
    lines.push(...buildExerciseLines(ex));
  }
  if (workout.memo) lines.push(`  メモ: ${workout.memo}`);
  return lines;
}

/**
 * 直近 N ヶ月のワークアウト履歴をプロンプトテキストに変換する戦略
 *
 * mobile 側から送られた WorkoutHistoryContext.data を日付昇順に並び替え、
 * Claude が理解しやすいマークダウン風のテキストに整形する。
 */
export class RecentMonthsStrategy implements WorkoutHistoryStrategy {
  buildPromptText(context: WorkoutHistoryContext): string {
    if (context.data.length === 0) return '';

    // toSorted() で元配列を変更せずに昇順ソート
    const sorted = context.data.toSorted((a, b) => a.date.localeCompare(b.date));
    const lines: string[] = ['【直近のトレーニング履歴】'];

    for (const workout of sorted) {
      lines.push(...buildWorkoutLines(workout));
    }

    return lines.join('\n');
  }
}
