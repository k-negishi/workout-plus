/**
 * useExerciseHistory テスト
 * - 統計集計（maxWeight/maxVolume計算）の正確性
 *
 * Jest 30 + Expo 54 の互換性問題を回避するため、
 * useExerciseHistory からエクスポートされた純粋関数を単体テストする
 */
import {
  buildHistory,
  calculateStats,
  type PRForStats,
  type SetWithWorkout,
} from '../useExerciseHistory';

describe('useExerciseHistory ロジック', () => {
  describe('calculateStats', () => {
    it('セットデータからmaxWeightを正しく算出する', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 100,
          reps: 5,
          set_number: 3,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.maxWeight).toBe(100);
    });

    it('セットデータからmaxVolumeを正しく算出する（セッション単位）', () => {
      // ワークアウトw1: 60*10 + 80*8 + 100*5 = 600 + 640 + 500 = 1740
      // ワークアウトw2: 90*8 + 90*6 = 720 + 540 = 1260
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 2000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 2000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 100,
          reps: 5,
          set_number: 3,
          workout_id: 'w1',
          completed_at: 2000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 90,
          reps: 8,
          set_number: 1,
          workout_id: 'w2',
          completed_at: 1000000,
          workout_exercise_id: 'we2',
        },
        {
          weight: 90,
          reps: 6,
          set_number: 2,
          workout_id: 'w2',
          completed_at: 1000000,
          workout_exercise_id: 'we2',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.maxVolume).toBe(1740);
    });

    it('セットデータからmaxRepsを正しく算出する', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 50,
          reps: 15,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 40,
          reps: 12,
          set_number: 3,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.maxReps).toBe(15);
    });

    it('totalSessionsをワークアウト数で正しくカウントする', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 3000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 70,
          reps: 8,
          set_number: 1,
          workout_id: 'w2',
          completed_at: 2000000,
          workout_exercise_id: 'we2',
        },
        {
          weight: 80,
          reps: 6,
          set_number: 1,
          workout_id: 'w3',
          completed_at: 1000000,
          workout_exercise_id: 'we3',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.totalSessions).toBe(3);
    });

    it('totalVolumeを全セットの合計で正しく算出する', () => {
      // 60*10 + 80*8 = 600 + 640 = 1240
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.totalVolume).toBe(1240);
    });

    it('weightやrepsがnullのセットはボリューム計算から除外する', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: null,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 70,
          reps: null,
          set_number: 3,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const stats = calculateStats(sets, []);
      // 60*10 = 600 のみ
      expect(stats.totalVolume).toBe(600);
      // maxWeightは70（nullでないweight）
      expect(stats.maxWeight).toBe(70);
    });

    it('データがない場合はデフォルト値を返す', () => {
      const stats = calculateStats([], []);
      expect(stats).toEqual({
        maxWeight: 0,
        maxVolume: 0,
        maxReps: 0,
        totalSessions: 0,
        totalVolume: 0,
        averageWeight: 0,
        lastPRDate: null,
        totalSets: 0,       // 追加
        maxEstimated1RM: 0, // 追加
      });
    });

    it('PR履歴から最新達成日を正しく取得する', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 100,
          reps: 5,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 5000000,
          workout_exercise_id: 'we1',
        },
      ];
      const prs: PRForStats[] = [
        { pr_type: 'max_weight', value: 100, workout_id: 'w1', achieved_at: 5000000 },
        { pr_type: 'max_volume', value: 500, workout_id: 'w1', achieved_at: 3000000 },
      ];
      const stats = calculateStats(sets, prs);
      expect(stats.lastPRDate).toBe(5000000);
    });

    it('averageWeightを正しく算出する', () => {
      // (60 + 80) / 2 = 70
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const stats = calculateStats(sets, []);
      expect(stats.averageWeight).toBe(70);
    });
  });

  describe('calculateStats - totalSets', () => {
    it('全セット数を正しくカウントする（nullも含む）', () => {
      const sets: SetWithWorkout[] = [
        { weight: 60, reps: 10, set_number: 1, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
        { weight: null, reps: 8, set_number: 2, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
        { weight: 70, reps: null, set_number: 3, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
      ];
      const stats = calculateStats(sets, []);
      // weight/reps が null でもセット数としてカウントされる
      expect(stats.totalSets).toBe(3);
    });

    it('データがない場合は0を返す', () => {
      const stats = calculateStats([], []);
      expect(stats.totalSets).toBe(0);
    });
  });

  describe('calculateStats - maxEstimated1RM', () => {
    it('Epley式で最高推定1RMを計算する', () => {
      // 80kg × (1 + 10/30) ≈ 106.67 vs 100kg × (1 + 5/30) ≈ 116.67 → max は 116.67
      const sets: SetWithWorkout[] = [
        { weight: 80, reps: 10, set_number: 1, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
        { weight: 100, reps: 5, set_number: 2, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
      ];
      const stats = calculateStats(sets, []);
      // 100 × (1 + 5/30) ≈ 116.67 が最大
      expect(stats.maxEstimated1RM).toBeGreaterThan(100);
    });

    it('weight/repsがnullのセットは除外される', () => {
      const sets: SetWithWorkout[] = [
        { weight: null, reps: 10, set_number: 1, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
        { weight: 50, reps: null, set_number: 2, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
      ];
      const stats = calculateStats(sets, []);
      // 有効なデータがないため 0
      expect(stats.maxEstimated1RM).toBe(0);
    });

    it('reps=1のときweight自体が最高RM', () => {
      const sets: SetWithWorkout[] = [
        { weight: 120, reps: 1, set_number: 1, workout_id: 'w1', completed_at: 1000000, workout_exercise_id: 'we1' },
      ];
      const stats = calculateStats(sets, []);
      // Epley式: reps=1 のとき weight * (1 + 1/30) ≈ 124 だが、
      // 仕様では reps=1 のときは weight をそのまま返す
      expect(stats.maxEstimated1RM).toBe(120);
    });
  });

  describe('buildHistory', () => {
    it('completedAt降順で返される', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 8,
          set_number: 1,
          workout_id: 'w2',
          completed_at: 3000000,
          workout_exercise_id: 'we2',
        },
        {
          weight: 70,
          reps: 6,
          set_number: 1,
          workout_id: 'w3',
          completed_at: 2000000,
          workout_exercise_id: 'we3',
        },
      ];
      const history = buildHistory(sets, new Set());

      expect(history[0]!.completedAt).toBe(3000000);
      expect(history[1]!.completedAt).toBe(2000000);
      expect(history[2]!.completedAt).toBe(1000000);
    });

    it('PRのあるワークアウトにhasPRフラグが付く', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 100,
          reps: 5,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 2000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 80,
          reps: 10,
          set_number: 1,
          workout_id: 'w2',
          completed_at: 1000000,
          workout_exercise_id: 'we2',
        },
      ];
      const prWorkoutIds = new Set(['w1']);
      const history = buildHistory(sets, prWorkoutIds);

      expect(history[0]!.hasPR).toBe(true); // w1
      expect(history[1]!.hasPR).toBe(false); // w2
    });

    it('同じworkoutIdの複数セットは1つのセッションにまとめられる', () => {
      const sets: SetWithWorkout[] = [
        {
          weight: 60,
          reps: 10,
          set_number: 1,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
        {
          weight: 70,
          reps: 8,
          set_number: 2,
          workout_id: 'w1',
          completed_at: 1000000,
          workout_exercise_id: 'we1',
        },
      ];
      const history = buildHistory(sets, new Set());
      expect(history).toHaveLength(1);
      expect(history[0]!.sets).toHaveLength(2);
    });

    it('空データでは空配列を返す', () => {
      const history = buildHistory([], new Set());
      expect(history).toHaveLength(0);
    });
  });
});
