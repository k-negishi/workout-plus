/**
 * useExerciseHistory - 種目履歴のデータ取得・集計フック
 * 統計情報、週ごとの重量推移、PR履歴、セッション全履歴を提供する
 */
import { format, startOfWeek, subMonths } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getDatabase } from '@/database/client';
import type { PRRow } from '@/database/types';

/** 統計サマリー */
export type ExerciseStats = {
  maxWeight: number;
  maxVolume: number;
  maxReps: number;
  totalSessions: number;
  totalVolume: number;
  averageWeight: number;
  lastPRDate: number | null;
  /** 全セット数（全ワークアウト合算、weight/reps null 含む） */
  totalSets: number;
  /** 全セット中の最高推定1RM（Epley式: weight * (1 + reps/30)）、データなしは0 */
  maxEstimated1RM: number;
};

/** 週ごとの平均重量データ（チャート用） */
export type WeeklyData = {
  weekLabel: string; // 'MM/DD'形式
  weekStart: Date;
  averageWeight: number;
};

/** PR履歴の1項目 */
export type PRHistoryItem = {
  prType: string;
  value: number;
  achievedAt: number;
};

/** セッション履歴の1項目 */
export type SessionHistoryItem = {
  workoutId: string;
  completedAt: number;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number | null;
  }>;
  hasPR: boolean;
};

/** セットのDB行型 */
export type SetWithWorkout = {
  weight: number | null;
  reps: number | null;
  set_number: number;
  workout_id: string;
  completed_at: number;
  workout_exercise_id: string;
};

/** PR行の簡易型（calculateStatsに渡す用） */
export type PRForStats = {
  pr_type: string;
  value: number;
  achieved_at: number;
  workout_id: string;
};

/** セットの基本集計値（単一セット視点）を計算するヘルパー */
function computeBasicSetStats(sets: SetWithWorkout[]): {
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
  averageWeight: number;
} {
  let maxWeight = 0;
  let maxReps = 0;
  let totalVolume = 0;
  let weightSum = 0;
  let weightCount = 0;

  for (const set of sets) {
    if (set.weight != null && set.weight > maxWeight) maxWeight = set.weight;
    if (set.reps != null && set.reps > maxReps) maxReps = set.reps;
    if (set.weight != null && set.reps != null) {
      totalVolume += set.weight * set.reps;
      weightSum += set.weight;
      weightCount++;
    }
  }

  return {
    maxWeight,
    maxReps,
    totalVolume,
    averageWeight: weightCount > 0 ? Math.round(weightSum / weightCount) : 0,
  };
}

/** セットをワークアウト単位に集約するマップを構築するヘルパー */
function buildWorkoutSessionMap(sets: SetWithWorkout[]): Map<
  string,
  {
    completedAt: number;
    sets: Array<{ setNumber: number; weight: number | null; reps: number | null }>;
    sessionVolume: number;
  }
> {
  const workoutMap = new Map<
    string,
    {
      completedAt: number;
      sets: Array<{ setNumber: number; weight: number | null; reps: number | null }>;
      sessionVolume: number;
    }
  >();

  for (const set of sets) {
    const setData = { setNumber: set.set_number, weight: set.weight, reps: set.reps };
    const setVolume = set.weight != null && set.reps != null ? set.weight * set.reps : 0;
    const existing = workoutMap.get(set.workout_id);
    if (existing) {
      existing.sets.push(setData);
      existing.sessionVolume += setVolume;
    } else {
      workoutMap.set(set.workout_id, {
        completedAt: set.completed_at,
        sets: [setData],
        sessionVolume: setVolume,
      });
    }
  }

  return workoutMap;
}

/**
 * セットデータからExerciseStats（統計サマリー）を計算する純粋関数
 * useExerciseHistoryのfetchData内で使用。テスト容易性のためエクスポート。
 */
export function calculateStats(sets: SetWithWorkout[], prs: PRForStats[]): ExerciseStats {
  const { maxWeight, maxReps, totalVolume, averageWeight } = computeBasicSetStats(sets);
  const workoutMap = buildWorkoutSessionMap(sets);

  // セッション単位の最大ボリュームを算出
  let maxVolume = 0;
  for (const [, data] of workoutMap) {
    if (data.sessionVolume > maxVolume) maxVolume = data.sessionVolume;
  }

  const lastPRDate = prs.length > 0 ? Math.max(...prs.map((pr) => pr.achieved_at)) : null;

  // 全セット数: weight/reps の null に関わらずすべてカウント
  const totalSets = sets.length;

  // 最高推定1RM: Epley式 weight * (1 + reps/30)
  // weight と reps の両方が null でない場合のみ計算対象
  // 循環依存を避けるため calculate1RM.ts への import はせずインライン計算する
  let maxEstimated1RM = 0;
  for (const set of sets) {
    if (set.weight != null && set.weight > 0 && set.reps != null && set.reps > 0) {
      // reps=1 のとき Epley 式は weight*1 = weight 自体が1RM
      const estimated1rm =
        set.reps === 1
          ? set.weight
          : Math.round(set.weight * (1 + set.reps / 30) * 100) / 100;
      if (estimated1rm > maxEstimated1RM) maxEstimated1RM = estimated1rm;
    }
  }

  return {
    maxWeight,
    maxVolume,
    maxReps,
    totalSessions: workoutMap.size,
    totalVolume,
    averageWeight,
    lastPRDate,
    totalSets,
    maxEstimated1RM,
  };
}

/**
 * セットデータからセッション履歴リストを生成する純粋関数
 * useExerciseHistoryのfetchData内で使用。テスト容易性のためエクスポート。
 */
export function buildHistory(
  sets: SetWithWorkout[],
  prWorkoutIds: Set<string>,
): SessionHistoryItem[] {
  const workoutMap = new Map<
    string,
    {
      completedAt: number;
      sets: Array<{ setNumber: number; weight: number | null; reps: number | null }>;
    }
  >();

  for (const set of sets) {
    const existing = workoutMap.get(set.workout_id);
    const setData = { setNumber: set.set_number, weight: set.weight, reps: set.reps };
    if (existing) {
      existing.sets.push(setData);
    } else {
      workoutMap.set(set.workout_id, {
        completedAt: set.completed_at,
        sets: [setData],
      });
    }
  }

  return Array.from(workoutMap.entries())
    .map(([workoutId, data]) => ({
      workoutId,
      completedAt: data.completedAt,
      sets: data.sets,
      hasPR: prWorkoutIds.has(workoutId),
    }))
    .sort((a, b) => b.completedAt - a.completedAt);
}

/* istanbul ignore next -- React hook本体はrenderHookが必要。純粋関数（calculateStats/buildHistory）はカバー済み */
export function useExerciseHistory(exerciseId: string) {
  const [stats, setStats] = useState<ExerciseStats>({
    maxWeight: 0,
    maxVolume: 0,
    maxReps: 0,
    totalSessions: 0,
    totalVolume: 0,
    averageWeight: 0,
    lastPRDate: null,
    totalSets: 0,
    maxEstimated1RM: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [prHistory, setPRHistory] = useState<PRHistoryItem[]>([]);
  const [allHistory, setAllHistory] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDatabase();

      // 完了済みワークアウトの全セットを取得
      const sets = await db.getAllAsync<SetWithWorkout>(
        `SELECT s.weight, s.reps, s.set_number, w.id AS workout_id, w.completed_at, we.id AS workout_exercise_id
         FROM sets s
         JOIN workout_exercises we ON s.workout_exercise_id = we.id
         JOIN workouts w ON we.workout_id = w.id
         WHERE we.exercise_id = ? AND w.status = 'completed'
         ORDER BY w.completed_at DESC, s.set_number ASC`,
        [exerciseId],
      );

      // PR履歴を取得
      const prs = await db.getAllAsync<PRRow>(
        'SELECT * FROM personal_records WHERE exercise_id = ?',
        [exerciseId],
      );

      // === 統計集計（エクスポートされた純粋関数を使用） ===
      setStats(calculateStats(sets, prs));

      // === PR履歴 ===
      setPRHistory(
        prs.map((pr) => ({
          prType: pr.pr_type,
          value: pr.value,
          achievedAt: pr.achieved_at,
        })),
      );

      // === 全履歴（日付降順） ===
      const prWorkoutIds = new Set(prs.map((pr) => pr.workout_id));
      setAllHistory(buildHistory(sets, prWorkoutIds));

      // === 週ごとの平均重量（過去3ヶ月） ===
      const threeMonthsAgo = subMonths(new Date(), 3).getTime();
      const weekMap = new Map<string, { totalWeight: number; count: number; weekStart: Date }>();

      for (const set of sets) {
        if (set.completed_at >= threeMonthsAgo && set.weight != null && set.weight > 0) {
          const weekStart = startOfWeek(new Date(set.completed_at), { weekStartsOn: 1 });
          const key = weekStart.toISOString();
          const existing = weekMap.get(key);
          if (existing) {
            existing.totalWeight += set.weight;
            existing.count++;
          } else {
            weekMap.set(key, { totalWeight: set.weight, count: 1, weekStart });
          }
        }
      }

      // 週をソートしてチャートデータに変換
      const weekly: WeeklyData[] = Array.from(weekMap.values())
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
        .map((w) => ({
          weekLabel: format(w.weekStart, 'M/d'),
          weekStart: w.weekStart,
          averageWeight: Math.round(w.totalWeight / w.count),
        }));
      setWeeklyData(weekly);
    } catch (error) {
      console.error('種目履歴の取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({ stats, weeklyData, prHistory, allHistory, loading, refetch: fetchData }),
    [stats, weeklyData, prHistory, allHistory, loading, fetchData],
  );
}
