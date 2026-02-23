/**
 * ExerciseRepository
 * 種目マスタのCRUD操作を提供する
 */
import { ulid } from 'ulid';

import { getDatabase } from '../client';
import type { Equipment, ExerciseRow, MuscleGroup } from '../types';

/** 種目作成パラメータ（カスタム種目用）。アプリ層に合わせて camelCase で統一 */
type CreateExerciseParams = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
};

/** 種目更新パラメータ */
type UpdateExerciseParams = Partial<Pick<ExerciseRow, 'name' | 'muscle_group' | 'equipment'>>;

export const ExerciseRepository = {
  /** 全種目を取得する（ユーザー定義の並び順） */
  async findAll(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>('SELECT * FROM exercises ORDER BY sort_order ASC');
  },

  /** 部位カテゴリで種目を検索する */
  async findByCategory(muscleGroup: MuscleGroup): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name',
      [muscleGroup],
    );
  },

  /** お気に入り種目を取得する */
  async findFavorites(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE is_favorite = 1 ORDER BY name',
    );
  },

  /** カスタム種目を取得する */
  async findCustom(): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>('SELECT * FROM exercises WHERE is_custom = 1 ORDER BY name');
  },

  /** 名前で種目を検索する（部分一致） */
  async search(query: string): Promise<ExerciseRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExerciseRow>('SELECT * FROM exercises WHERE name LIKE ? ORDER BY name', [
      `%${query}%`,
    ]);
  },

  /** カスタム種目を作成する */
  async create(params: CreateExerciseParams): Promise<ExerciseRow> {
    const db = await getDatabase();
    const now = Date.now();
    const id = ulid();

    // 現在の最大 sort_order を取得し、+1 して新規種目の順序を末尾に設定する
    // テーブルが空の場合は COALESCE で 0 を返すため sort_order = 1 になる
    const maxRow = await db.getFirstAsync<{ max_sort: number | null }>(
      'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM exercises',
    );
    const sortOrder = (maxRow?.max_sort ?? 0) + 1;

    await db.runAsync(
      `INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_favorite, created_at, updated_at, sort_order)
       VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
      // DBカラム名は snake_case のまま。params は camelCase で受け取る
      [id, params.name, params.muscleGroup, params.equipment, now, now, sortOrder],
    );

    const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', [id]);

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
    await db.runAsync(`UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /**
   * 複数種目の sort_order を一括更新する
   * withTransactionAsync でアトミックに実行し、部分更新を防ぐ
   */
  async updateSortOrders(orders: { id: string; sortOrder: number }[]): Promise<void> {
    if (orders.length === 0) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const { id, sortOrder } of orders) {
        await db.runAsync('UPDATE exercises SET sort_order = ? WHERE id = ?', [sortOrder, id]);
      }
    });
  },

  /** お気に入りをトグルする */
  async toggleFavorite(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE exercises SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?`,
      [Date.now(), id],
    );
  },
};
