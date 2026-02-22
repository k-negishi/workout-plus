/**
 * 前回記録取得フック
 * 指定された種目の直近ワークアウトからセットデータを返す
 */
import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/database/client';
import type { WorkoutSet } from '@/types';

/** 前回記録の型 */
export type PreviousRecord = {
  /** 前回のセットデータ */
  sets: WorkoutSet[];
  /** 前回のワークアウト日時 */
  workoutDate: Date;
};

/** フックの戻り値型 */
export type UsePreviousRecordReturn = {
  /** 前回記録（存在しない場合はnull） */
  previousRecord: PreviousRecord | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
};

/**
 * 指定された種目の前回記録を取得するカスタムフック
 * @param exerciseId 種目ID
 * @param currentWorkoutId 現在のワークアウトID（除外用）
 */
export function usePreviousRecord(
  exerciseId: string,
  currentWorkoutId: string | null,
): UsePreviousRecordReturn {
  const [previousRecord, setPreviousRecord] = useState<PreviousRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreviousRecord = useCallback(async () => {
    if (!exerciseId) {
      setPreviousRecord(null);
      setIsLoading(false);
      return;
    }

    try {
      const db = await getDatabase();

      // 現在のワークアウトを除外して、直近の完了済みワークアウトを検索
      const excludeClause = currentWorkoutId ? 'AND w.id != ?' : '';
      const params: (string | number)[] = [exerciseId];
      if (currentWorkoutId) {
        params.push(currentWorkoutId);
      }

      const row = await db.getFirstAsync<{
        workout_exercise_id: string;
        created_at: number;
      }>(
        `SELECT we.id AS workout_exercise_id, w.created_at
         FROM workout_exercises we
         JOIN workouts w ON we.workout_id = w.id
         WHERE we.exercise_id = ? AND w.status = 'completed' ${excludeClause}
         ORDER BY w.created_at DESC
         LIMIT 1`,
        params,
      );

      if (!row) {
        setPreviousRecord(null);
        setIsLoading(false);
        return;
      }

      // 前回のセットデータを取得
      const setRows = await db.getAllAsync<{
        id: string;
        workout_exercise_id: string;
        set_number: number;
        weight: number | null;
        reps: number | null;
        estimated_1rm: number | null;
        created_at: number;
        updated_at: number;
      }>('SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number', [
        row.workout_exercise_id,
      ]);

      const sets: WorkoutSet[] = setRows.map((s) => ({
        id: s.id,
        workoutExerciseId: s.workout_exercise_id,
        setNumber: s.set_number,
        weight: s.weight,
        reps: s.reps,
        estimated1RM: s.estimated_1rm,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));

      setPreviousRecord({
        sets,
        workoutDate: new Date(row.created_at),
      });
    } catch {
      setPreviousRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, currentWorkoutId]);

  useEffect(() => {
    void fetchPreviousRecord();
  }, [fetchPreviousRecord]);

  return { previousRecord, isLoading };
}
