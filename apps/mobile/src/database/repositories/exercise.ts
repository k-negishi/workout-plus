/**
 * ExerciseRepository
 * 種目マスタのCRUD操作を提供する
 */
import { ulid } from 'ulid';

import { getDatabase } from '../client';
import type { Equipment, ExerciseRow, MuscleGroup } from '../types';

/** 種目作成パラメータ（カスタム種目用） */
type CreateExerciseParams = {
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
};

/** 種目更新パラメータ */
type UpdateExerciseParams = Partial<
  Pick<ExerciseRow, 'name' | 'muscle_group' | 'equipment'>
>;

export const ExerciseRepository = {
  /** 全種目を取得する（名前順） */
  async findAll(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises ORDER BY muscle_group, name'
    );
  },

  /** 部位カテゴリで種目を検索する */
  async findByCategory(muscleGroup: MuscleGroup): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name',
      [muscleGroup]
    );
  },

  /** お気に入り種目を取得する */
  async findFavorites(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE is_favorite = 1 ORDER BY name'
    );
  },

  /** カスタム種目を取得する */
  async findCustom(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE is_custom = 1 ORDER BY name'
    );
  },

  /** 名前で種目を検索する（部分一致） */
  async search(query: string): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name',
      [`%${query}%`]
    );
  },

  /** カスタム種目を作成する */
  async create(params: CreateExerciseParams): Promise<ExerciseRow> {
    const db = await getDatabase();
    const now = Date.now();
    const id = ulid();

    await db.runAsync(
      `INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
      [id, params.name, params.muscle_group, params.equipment, now, now]
    );

    const row = await db.getFirstAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE id = ?',
      [id]
    );

    if (!row) {
      throw new Error('種目の作成に失敗しました');
    }

    return row;
  },

  /** 種目を更新する */
  async update(id: string, params: UpdateExerciseParams): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) {
      return;
    }

    // updated_at を自動更新
    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);
    await db.runAsync(
      `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  /** お気に入りをトグルする */
  async toggleFavorite(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE exercises SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    );
  },
};
