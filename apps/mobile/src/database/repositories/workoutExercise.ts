/**
 * WorkoutExerciseRepository
 * ワークアウト内の種目（中間テーブル）のCRUD操作を提供する
 */
import { ulid } from 'ulid';

import type { WorkoutExercise } from '@/types/workout';

import { getDatabase } from '../client';
import type { WorkoutExerciseRow } from '../types';

/** DB行型（snake_case） → アプリ型（camelCase）への変換 */
function rowToWorkoutExercise(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    displayOrder: row.display_order,
    memo: row.memo,
    createdAt: row.created_at,
  };
}

/** 種目追加パラメータ */
type CreateWorkoutExerciseParams = {
  workoutId: string;
  exerciseId: string;
  displayOrder: number;
  memo?: string | null;
};

/** 種目更新パラメータ */
type UpdateWorkoutExerciseParams = Partial<{
  displayOrder: number;
  memo: string | null;
}>;

export const WorkoutExerciseRepository = {
  /** ワークアウトに紐づく種目を display_order 順で取得する */
  async findByWorkoutId(workoutId: string): Promise<WorkoutExercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<WorkoutExerciseRow>(
      'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
      [workoutId],
    );
    return rows.map(rowToWorkoutExercise);
  },

  /** ワークアウト内の種目を作成する */
  async create(params: CreateWorkoutExerciseParams): Promise<WorkoutExercise> {
    const db = await getDatabase();
    const now = Date.now();
    const id = ulid();

    await db.runAsync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, display_order, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, params.workoutId, params.exerciseId, params.displayOrder, params.memo ?? null, now],
    );

    const row = await db.getFirstAsync<WorkoutExerciseRow>(
      'SELECT * FROM workout_exercises WHERE id = ?',
      [id],
    );

    if (!row) {
      throw new Error('ワークアウト種目の作成に失敗しました');
    }

    return rowToWorkoutExercise(row);
  },

  /** ワークアウト内の種目を更新する */
  async update(id: string, params: UpdateWorkoutExerciseParams): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    // camelCase → snake_case マッピング
    const keyMap: Record<string, string> = {
      displayOrder: 'display_order',
      memo: 'memo',
    };

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        const column = keyMap[key];
        if (column) {
          fields.push(`${column} = ?`);
          values.push(value as string | number | null);
        }
      }
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await db.runAsync(`UPDATE workout_exercises SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /** ワークアウト内の種目を削除する（CASCADE でセットも削除される） */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]);
  },

  /** ワークアウトの次の display_order を取得する */
  async getNextDisplayOrder(workoutId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(display_order) as max_order FROM workout_exercises WHERE workout_id = ?',
      [workoutId],
    );
    return (result?.max_order ?? -1) + 1;
  },

  /** display_order を 0 から連番で振り直す */
  async reorder(workoutId: string): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Pick<WorkoutExerciseRow, 'id'>>(
      'SELECT id FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
      [workoutId],
    );

    for (const [i, row] of rows.entries()) {
      await db.runAsync('UPDATE workout_exercises SET display_order = ? WHERE id = ?', [i, row.id]);
    }
  },
};
