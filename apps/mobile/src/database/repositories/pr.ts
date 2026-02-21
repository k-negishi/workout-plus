/**
 * PersonalRecordRepository
 * PR（自己記録）のUPSERT・検索・再計算を提供する
 */
import { ulid } from 'ulid';

import type { PersonalRecord,PRType } from '@/types/pr';

import { getDatabase } from '../client';
import type { PRRow } from '../types';

/** DB行型（snake_case） → アプリ型（camelCase）への変換 */
function rowToPR(row: PRRow): PersonalRecord {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    prType: row.pr_type,
    value: row.value,
    workoutId: row.workout_id,
    achievedAt: row.achieved_at,
  };
}

export const PersonalRecordRepository = {
  /**
   * PRをUPSERTする
   * exercise_id + pr_type のUNIQUE制約を利用し、
   * 既存レコードがあれば値が大きい場合のみ更新する
   */
  async upsert(params: {
    exerciseId: string;
    prType: PRType;
    value: number;
    workoutId: string;
    achievedAt: number;
  }): Promise<PersonalRecord> {
    const db = await getDatabase();

    // 既存のPRを取得
    const existing = await db.getFirstAsync<PRRow>(
      'SELECT * FROM personal_records WHERE exercise_id = ? AND pr_type = ?',
      [params.exerciseId, params.prType]
    );

    if (!existing) {
      // 新規作成
      const id = ulid();
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, pr_type, value, workout_id, achieved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, params.exerciseId, params.prType, params.value, params.workoutId, params.achievedAt]
      );

      const row = await db.getFirstAsync<PRRow>(
        'SELECT * FROM personal_records WHERE id = ?',
        [id]
      );

      if (!row) {
        throw new Error('PRの作成に失敗しました');
      }

      return rowToPR(row);
    }

    if (params.value > existing.value) {
      // 既存より大きい値の場合のみ更新
      await db.runAsync(
        `UPDATE personal_records SET value = ?, workout_id = ?, achieved_at = ? WHERE id = ?`,
        [params.value, params.workoutId, params.achievedAt, existing.id]
      );
    }

    // 更新後（または更新不要時）の現在値を返す
    const current = await db.getFirstAsync<PRRow>(
      'SELECT * FROM personal_records WHERE id = ?',
      [existing.id]
    );

    if (!current) {
      throw new Error('PRの取得に失敗しました');
    }

    return rowToPR(current);
  },

  /** 種目のPR全件を取得する */
  async findByExerciseId(exerciseId: string): Promise<PersonalRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PRRow>(
      'SELECT * FROM personal_records WHERE exercise_id = ?',
      [exerciseId]
    );
    return rows.map(rowToPR);
  },

  /**
   * 指定種目のPRを全ワークアウト履歴から再計算してupsertする
   * セット編集・削除後に呼び出して整合性を維持する
   *
   * 全completedワークアウトのその種目のセットを走査し、
   * max_weight / max_volume(セッション合計) / max_reps を計算
   */
  async recalculateForExercise(exerciseId: string): Promise<void> {
    const db = await getDatabase();

    // 既存PRを削除してから再計算
    await db.runAsync(
      'DELETE FROM personal_records WHERE exercise_id = ?',
      [exerciseId]
    );

    // completedワークアウトに紐づく該当種目の全セットを取得
    const sets = await db.getAllAsync<{
      weight: number | null;
      reps: number | null;
      workout_id: string;
      completed_at: number;
    }>(
      `SELECT s.weight, s.reps, w.id AS workout_id, w.completed_at
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id = ? AND w.status = 'completed'
       ORDER BY w.completed_at`,
      [exerciseId]
    );

    if (sets.length === 0) {
      return;
    }

    // max_weight: 単一セットの最大重量
    let maxWeight = 0;
    let maxWeightWorkoutId = '';
    let maxWeightAchievedAt = 0;

    // max_reps: 単一セットの最大レップ数
    let maxReps = 0;
    let maxRepsWorkoutId = '';
    let maxRepsAchievedAt = 0;

    // max_volume: 1セッション内の全セット合計（Σ weight * reps）
    const volumeByWorkout = new Map<
      string,
      { volume: number; completedAt: number }
    >();

    for (const set of sets) {
      // max_weight 判定
      if (set.weight != null && set.weight > maxWeight) {
        maxWeight = set.weight;
        maxWeightWorkoutId = set.workout_id;
        maxWeightAchievedAt = set.completed_at;
      }

      // max_reps 判定
      if (set.reps != null && set.reps > maxReps) {
        maxReps = set.reps;
        maxRepsWorkoutId = set.workout_id;
        maxRepsAchievedAt = set.completed_at;
      }

      // volume 集計（weight と reps の両方が必要）
      if (set.weight != null && set.reps != null) {
        const current = volumeByWorkout.get(set.workout_id) ?? {
          volume: 0,
          completedAt: set.completed_at,
        };
        current.volume += set.weight * set.reps;
        volumeByWorkout.set(set.workout_id, current);
      }
    }

    // max_volume を決定
    let maxVolume = 0;
    let maxVolumeWorkoutId = '';
    let maxVolumeAchievedAt = 0;

    for (const [workoutId, data] of volumeByWorkout) {
      if (data.volume > maxVolume) {
        maxVolume = data.volume;
        maxVolumeWorkoutId = workoutId;
        maxVolumeAchievedAt = data.completedAt;
      }
    }

    // PRをINSERT（値が0より大きい場合のみ）
    const prsToInsert: Array<{
      exerciseId: string;
      prType: PRType;
      value: number;
      workoutId: string;
      achievedAt: number;
    }> = [];

    if (maxWeight > 0) {
      prsToInsert.push({
        exerciseId,
        prType: 'max_weight',
        value: maxWeight,
        workoutId: maxWeightWorkoutId,
        achievedAt: maxWeightAchievedAt,
      });
    }

    if (maxReps > 0) {
      prsToInsert.push({
        exerciseId,
        prType: 'max_reps',
        value: maxReps,
        workoutId: maxRepsWorkoutId,
        achievedAt: maxRepsAchievedAt,
      });
    }

    if (maxVolume > 0) {
      prsToInsert.push({
        exerciseId,
        prType: 'max_volume',
        value: maxVolume,
        workoutId: maxVolumeWorkoutId,
        achievedAt: maxVolumeAchievedAt,
      });
    }

    // recalculate時はupsertの大小比較ではなく直接INSERT（既存は上で削除済み）
    for (const pr of prsToInsert) {
      const id = ulid();
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, pr_type, value, workout_id, achieved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, pr.exerciseId, pr.prType, pr.value, pr.workoutId, pr.achievedAt]
      );
    }
  },
};
