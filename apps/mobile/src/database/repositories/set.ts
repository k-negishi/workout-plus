/**
 * SetRepository
 * セット（1回の挙上記録）のCRUD操作を提供する
 */
import { ulid } from 'ulid';

import type { WorkoutSet } from '@/types/workout';

import { getDatabase } from '../client';
import type { SetRow } from '../types';

/** DB行型（snake_case） → アプリ型（camelCase）への変換 */
function rowToSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
    estimated1rm: row.estimated_1rm,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** セット作成パラメータ */
type CreateSetParams = {
  workoutExerciseId: string;
  setNumber: number;
  weight?: number | null;
  reps?: number | null;
};

/** セット更新パラメータ */
type UpdateSetParams = Partial<{
  weight: number | null;
  reps: number | null;
  estimated1rm: number | null;
  setNumber: number;
}>;

/**
 * Epley式で推定1RMを計算する
 * weight * (1 + reps / 30)
 * weight または reps が null の場合は null を返す
 */
function calculateEstimated1RM(
  weight: number | null | undefined,
  reps: number | null | undefined
): number | null {
  if (weight == null || reps == null) {
    return null;
  }
  return weight * (1 + reps / 30);
}

/**
 * update()でweight/repsが省略された場合にDBから現在値を取得するヘルパー
 * 複雑度を分離してupdate()をシンプルに保つ
 */
async function resolveWeightAndReps(
  db: Awaited<ReturnType<typeof getDatabase>>,
  id: string,
  paramsWeight: number | null | undefined,
  paramsReps: number | null | undefined
): Promise<{ weight: number | null | undefined; reps: number | null | undefined }> {
  if (paramsWeight !== undefined && paramsReps !== undefined) {
    return { weight: paramsWeight, reps: paramsReps };
  }
  const current = await db.getFirstAsync<SetRow>(
    'SELECT * FROM sets WHERE id = ?',
    [id]
  );
  if (!current) {
    throw new Error('更新対象のセットが見つかりません');
  }
  return {
    weight: paramsWeight !== undefined ? paramsWeight : current.weight,
    reps: paramsReps !== undefined ? paramsReps : current.reps,
  };
}

export const SetRepository = {
  /** workout_exercise_id に紐づくセットを set_number 順で取得する */
  async findByWorkoutExerciseId(
    workoutExerciseId: string
  ): Promise<WorkoutSet[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SetRow>(
      'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
      [workoutExerciseId]
    );
    return rows.map(rowToSet);
  },

  /** セットを作成する（estimated_1rm はEpley式で自動計算） */
  async create(params: CreateSetParams): Promise<WorkoutSet> {
    const db = await getDatabase();
    const now = Date.now();
    const id = ulid();
    const weight = params.weight ?? null;
    const reps = params.reps ?? null;
    const estimated1rm = calculateEstimated1RM(weight, reps);

    await db.runAsync(
      `INSERT INTO sets (id, workout_exercise_id, set_number, weight, reps, estimated_1rm, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.workoutExerciseId, params.setNumber, weight, reps, estimated1rm, now, now]
    );

    const row = await db.getFirstAsync<SetRow>(
      'SELECT * FROM sets WHERE id = ?',
      [id]
    );

    if (!row) {
      throw new Error('セットの作成に失敗しました');
    }

    return rowToSet(row);
  },

  /** セットを更新する（weight/reps変更時にestimated_1rmも再計算） */
  async update(id: string, params: UpdateSetParams): Promise<void> {
    const db = await getDatabase();
    // 現在値の解決（省略されたフィールドはDBから補完）
    const { weight: newWeight, reps: newReps } = await resolveWeightAndReps(
      db, id, params.weight, params.reps
    );

    // camelCase → snake_case マッピング
    const keyMap: Record<string, string> = {
      weight: 'weight',
      reps: 'reps',
      estimated1rm: 'estimated_1rm',
      setNumber: 'set_number',
    };

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== 'estimated1rm') {
        const column = keyMap[key];
        if (column) {
          fields.push(`${column} = ?`);
          values.push(value as string | number | null);
        }
      }
    }

    // estimated_1rm を再計算して追加
    fields.push('estimated_1rm = ?', 'updated_at = ?');
    values.push(calculateEstimated1RM(newWeight, newReps), Date.now());

    values.push(id);
    await db.runAsync(
      `UPDATE sets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  /** セットを1件削除する */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
  },

  /** workout_exercise_id に紐づく全セットを一括削除する */
  async deleteByWorkoutExerciseId(
    workoutExerciseId: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM sets WHERE workout_exercise_id = ?',
      [workoutExerciseId]
    );
  },

  /** set_number を 1 から連番で振り直す */
  async renumberSets(workoutExerciseId: string): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Pick<SetRow, 'id'>>(
      'SELECT id FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
      [workoutExerciseId]
    );

    for (const [i, row] of rows.entries()) {
      await db.runAsync('UPDATE sets SET set_number = ? WHERE id = ?', [
        i + 1,
        row.id,
      ]);
    }
  },
};
