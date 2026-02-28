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
  /** 過去日付記録時に指定する UNIX ミリ秒。省略時は Date.now() */
  createdAt?: number;
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
   * status='recording', timer_status='not_started' で初期化
   */
  async create(params?: CreateWorkoutParams): Promise<WorkoutRow> {
    const db = await getDatabase();
    // createdAt が指定された場合は過去日付記録として使用する
    const now = params?.createdAt ?? Date.now();
    const id = ulid();

    await db.runAsync(
      `INSERT INTO workouts (id, status, created_at, started_at, completed_at, timer_status, elapsed_seconds, timer_started_at, memo)
       VALUES (?, 'recording', ?, NULL, NULL, 'not_started', 0, NULL, ?)`,
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

  /**
   * 本日作成された進行中（recording）のワークアウトを1件取得する。
   *
   * ホーム画面の「記録中のワークアウト」バナー表示に使用する。
   * 前日以前に作成された recording は除外するため、
   * created_at が本日（端末ローカル時刻）の範囲内であることを条件に加える。
   */
  async findTodayRecording(): Promise<WorkoutRow | null> {
    const db = await getDatabase();
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dayEnd = dayStart + 86400000; // 翌日 0:00
    return db.getFirstAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'recording' AND created_at >= ? AND created_at < ? LIMIT 1",
      [dayStart, dayEnd],
    );
  },

  /** 完了済みワークアウトを全件取得する（created_at降順） */
  async findAllCompleted(): Promise<WorkoutRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'completed' ORDER BY created_at DESC",
    );
  },

  /**
   * 当日の完了済みワークアウトを取得する（最新1件）
   * 端末のローカル時刻で当日0:00〜翌日0:00の範囲を計算する
   */
  async findTodayCompleted(): Promise<WorkoutRow | null> {
    const db = await getDatabase();
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dayEnd = dayStart + 86400000; // 翌日0:00
    return db.getFirstAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at DESC LIMIT 1",
      [dayStart, dayEnd],
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

    // status が 'completed' に変更され、かつ completed_at が提供された場合に
    // workout_date をローカル時刻で自動算出する
    // （UTC ではなく端末のローカル時刻で日付を決定するのは、ユーザーの感覚に合わせるため）
    if (params.status === 'completed' && params.completed_at != null) {
      const date = new Date(params.completed_at);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      fields.push('workout_date = ?');
      values.push(`${yyyy}-${mm}-${dd}`);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await db.runAsync(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /**
   * 指定日の完了済みワークアウトを取得する（最新1件）
   * 過去日付への追記判定に使用する
   *
   * @param dateString - 'yyyy-MM-dd' 形式の日付文字列
   */
  async findCompletedByDate(dateString: string): Promise<WorkoutRow | null> {
    const db = await getDatabase();
    const [year, month, day] = dateString.split('-').map(Number);
    // month は 0-indexed
    const dayStart = new Date(year!, month! - 1, day!).getTime();
    const dayEnd = dayStart + 86400000; // 翌日0:00
    return db.getFirstAsync<WorkoutRow>(
      "SELECT * FROM workouts WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at DESC LIMIT 1",
      [dayStart, dayEnd],
    );
  },

  /** ワークアウトを削除する（CASCADE で関連レコードも削除） */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  },
};
