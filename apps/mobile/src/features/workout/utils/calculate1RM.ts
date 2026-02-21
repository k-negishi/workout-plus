/**
 * 推定1RM計算とボリューム集計ユーティリティ
 */

/**
 * Epley式で推定1RMを計算する
 * 計算式: weight * (1 + reps / 30)
 *
 * reps=1の場合はweight自体が1RMとなる
 * weight または reps が0以下の場合は0を返す
 */
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    return 0;
  }

  // 1レップの場合はそのままの重量が1RM
  if (reps === 1) {
    return weight;
  }

  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

/**
 * セッション内の種目ボリューム合計を計算する
 * ボリューム = Sigma(weight * reps) で、weight/repsがnullのセットは無視
 */
export function calculateVolume(
  sets: Array<{ weight: number | null; reps: number | null }>,
): number {
  return sets.reduce((total, set) => {
    if (set.weight != null && set.reps != null && set.weight > 0 && set.reps > 0) {
      return total + set.weight * set.reps;
    }
    return total;
  }, 0);
}
