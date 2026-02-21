/**
 * WorkoutRepository
 * ワークアウトのCRUD操作を提供する
 */
import { ulid } from 'ulid';

import { getDatabase } from '../client';
import type { WorkoutRow, WorkoutStatus } from '../types';

/** ワークアウト作成パラメータ */
type CreateWorkoutParams = {
  memo?: string | null;
};

/** ワークアウト更新パラメータ */
type UpdateWorkoutParams = Partial<
  Pick<
    WorkoutRow,
    | 'status'
    | 'started_at'
    | 'completed_at'
    | 'timer_status'
    | 'elapsed_seconds'
    | 'timer_started_at'
    | 'memo'
  >
>;

export const WorkoutRepository = {
  /**
   * 新規ワークアウトを作成する
   * status='recording', timer_status='notStarted' で初期化
   */
  async create(params?: CreateWorkoutParams): Promise<WorkoutRow> {
    const db = await getDatabase();
    const now = Date.now();
    const id = ulid();

    await db.runAsync(
      `INSERT INTO workouts (id, status, created_at, started_at, completed_at, timer_status, elapsed_seconds, timer_started_at, memo)
       VALUES (?, 'recording', ?, NULL, NULL, 'notStarted', 0, NULL, ?)`,
      [id, now, params?.memo ?? null],
    );

    // 作成した行を返す
    const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]);

    if (!row) {
      throw new Error('ワークアウトの作成に失敗しました');
    }

    return row;
  },

  /** IDでワークアウトを取得する */
  async findById(id: string): Promise<WorkoutRow | null> {
    const db = await getDatabase();
    return db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]);
  },

  /** ステータスでワークアウトを検索する */
  async findByStatus(status: WorkoutStatus): Promise<WorkoutRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<WorkoutRow>(
      'SELECT * FROM workouts WHERE status = ? ORDER BY created_at DESC',
      [status],
    );
  },

  /** 現在進行中（recording）のワークアウトを1件取得する */
  async findRecording(): Promise<WorkoutRow | null> {
    const db = await getDatabase();
    return db.getFirstAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'recording' LIMIT 1",
    );
  },

  /** 完了済みワークアウトを全件取得する（created_at降順） */
  async findAllCompleted(): Promise<WorkoutRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'completed' ORDER BY created_at DESC",
    );
  },

  /** ワークアウトを更新する */
  async update(id: string, params: UpdateWorkoutParams): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    // 動的にSETクエリを構築
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await db.runAsync(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /** ワークアウトを削除する（CASCADE で関連レコードも削除） */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  },
};
