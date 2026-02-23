/**
 * データベースマイグレーション
 * PRAGMA user_version でスキーマバージョンを管理し、
 * withTransactionAsync で原子的にマイグレーションを実行する
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { ALL_CREATE_TABLES, CREATE_INDEXES } from './schema';
import { generateDevWorkoutSeedSQL, generateSeedSQL } from './seed';

/** 現在の最新スキーマバージョン */
const LATEST_VERSION = 5;

/**
 * 現在のスキーマバージョンを取得する
 */
async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return result?.user_version ?? 0;
}

/**
 * スキーマバージョンを設定する
 */
async function setSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

/**
 * バージョン 0 → 1: 全テーブル作成 + プリセットシード投入
 */
async function migrateV0ToV1(db: SQLiteDatabase): Promise<void> {
  // テーブル作成（外部キー依存順に実行）
  for (const createSQL of ALL_CREATE_TABLES) {
    await db.execAsync(createSQL);
  }

  // インデックス作成
  for (const indexSQL of CREATE_INDEXES) {
    await db.execAsync(indexSQL);
  }

  // プリセット種目のシードデータ投入
  const seedSQL = generateSeedSQL();
  await db.execAsync(seedSQL);
}

/**
 * バージョン 1 → 2: 開発用ワークアウトシードデータ投入
 */
async function migrateV1ToV2(db: SQLiteDatabase): Promise<void> {
  await generateDevWorkoutSeedSQL(db);
}

/**
 * バージョン 2 → 3: 開発用シードデータのタイムスタンプ修正
 *
 * v2 で投入したシードデータのタイムスタンプが誤っていた（2025年のUNIX時刻を使用）。
 * カレンダー画面で 2026/2/1 を選択したときに履歴が表示されるよう正しい値に更新する。
 * - 旧: 1738339200000 (2025-02-01 01:00 JST)
 * - 新: 1769878800000 (2026-02-01 02:00 JST)
 */
async function migrateV2ToV3(db: SQLiteDatabase): Promise<void> {
  const OLD_CREATED_AT = 1738332000000;
  const OLD_COMPLETED_AT = 1738339200000;
  const NEW_CREATED_AT = 1769871600000; // 2026/2/1 00:00 JST
  const NEW_COMPLETED_AT = 1769878800000; // 2026/2/1 02:00 JST

  // workouts テーブルのタイムスタンプを更新（古い seed データのみ対象）
  await db.execAsync(
    `UPDATE workouts SET created_at = ${NEW_CREATED_AT}, completed_at = ${NEW_COMPLETED_AT} WHERE completed_at = ${OLD_COMPLETED_AT}`,
  );

  // workout_exercises テーブルのタイムスタンプを更新
  await db.execAsync(
    `UPDATE workout_exercises SET created_at = ${NEW_CREATED_AT} WHERE created_at = ${OLD_CREATED_AT}`,
  );

  // sets テーブルのタイムスタンプを更新（seed で挿入したセット行のみ）
  await db.execAsync(
    `UPDATE sets SET created_at = ${NEW_CREATED_AT}, updated_at = ${NEW_CREATED_AT} WHERE created_at = ${OLD_CREATED_AT}`,
  );
}

/**
 * バージョン 3 → 4: timer_status の値を snake_case に統一
 *
 * 'notStarted' は camelCase であり、他の値（'running' 等）と命名規則が異なる。
 * DB格納値の snake_case 統一のため 'not_started' に移行する。
 */
async function migrateV3ToV4(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `UPDATE workouts SET timer_status = 'not_started' WHERE timer_status = 'notStarted'`,
  );
}

/**
 * バージョン 4 → 5: workouts テーブルに workout_date カラムを追加
 *
 * workout_date は完了したワークアウトの日付を yyyy-MM-dd 形式で保持する。
 * 1日に1件のみ completed ワークアウトを許可するため、UNIQUE 部分インデックスを作成する。
 * recording 状態（workout_date = NULL）は UNIQUE 制約の対象外（複数の NULL が共存可能）。
 *
 * 既存の completed データは completed_at（UNIX ミリ秒）からローカルタイムで日付を算出する。
 * 同日の重複がある場合は最新のものを残し、古い方を削除する。
 *
 * 冪等性について:
 * ALTER TABLE は SQLite の DDL であり、withTransactionAsync 内でも暗黙的にコミットされる。
 * マイグレーション中に後続ステップが失敗すると ROLLBACK が効かず user_version が 4 のまま残る。
 * 次回起動時に V5 が再実行されると "duplicate column name" でクラッシュするため、
 * カラム存在チェック・IS NULL 絞り込み・IF NOT EXISTS で冪等に実装する。
 */
async function migrateV4ToV5(db: SQLiteDatabase): Promise<void> {
  // 1. workout_date カラムが未存在の場合のみ追加する
  //    PRAGMA table_info で事前にチェックして冪等性を確保する
  //    （ALTER TABLE は DDL のため重複実行すると "duplicate column name" エラーになる）
  const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(workouts)');
  const hasWorkoutDate = tableInfo.some((col) => col.name === 'workout_date');
  if (!hasWorkoutDate) {
    await db.execAsync('ALTER TABLE workouts ADD COLUMN workout_date TEXT');
  }

  // 2. 既存の completed ワークアウトから workout_date を算出する
  //    workout_date IS NULL 条件を追加することで、再実行時に設定済みのレコードを除外する
  //    completed_at は UNIX ミリ秒（INTEGER）
  const completedWorkouts = await db.getAllAsync<{ id: string; completed_at: number }>(
    "SELECT id, completed_at FROM workouts WHERE status = 'completed' AND completed_at IS NOT NULL AND workout_date IS NULL",
  );

  // 日付ごとにグルーピングし、同日重複があれば最新のみ残す
  const dateMap = new Map<string, { id: string; completed_at: number }>();
  const toDelete: string[] = [];

  for (const w of completedWorkouts) {
    const date = new Date(w.completed_at);
    // ローカルタイムで日付文字列を生成（ユーザーが記録した日付に対応させる）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existing = dateMap.get(dateStr);
    if (existing != null) {
      // 同日重複: 古い方を削除リストに追加し、新しい方を保持する
      if (w.completed_at > existing.completed_at) {
        toDelete.push(existing.id);
        dateMap.set(dateStr, w);
      } else {
        toDelete.push(w.id);
      }
    } else {
      dateMap.set(dateStr, w);
    }
  }

  // 重複データを削除（古いレコードを除去してデータ整合性を保つ）
  for (const id of toDelete) {
    await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  }

  // 各 completed ワークアウトに workout_date を設定する
  for (const [dateStr, w] of dateMap) {
    await db.runAsync('UPDATE workouts SET workout_date = ? WHERE id = ?', [dateStr, w.id]);
  }

  // 3. UNIQUE 部分インデックスを作成する
  //    IF NOT EXISTS を使用して再実行時のエラーを防ぐ（冪等性）
  //    WHERE workout_date IS NOT NULL: recording 状態（NULL）は制約対象外とする
  await db.execAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_unique_date ON workouts(workout_date) WHERE workout_date IS NOT NULL',
  );
}

/** マイグレーション関数の型 */
type Migration = (db: SQLiteDatabase) => Promise<void>;

/** バージョンごとのマイグレーション関数マップ */
const MIGRATIONS: Record<number, Migration> = {
  1: migrateV0ToV1,
  2: migrateV1ToV2,
  3: migrateV2ToV3,
  4: migrateV3ToV4,
  5: migrateV4ToV5,
};

/**
 * マイグレーションを実行する
 * 現在バージョンから最新バージョンまで順次適用する
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getSchemaVersion(db);

  if (currentVersion >= LATEST_VERSION) {
    return;
  }

  // 各バージョンのマイグレーションを順次実行
  for (let v = currentVersion + 1; v <= LATEST_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) {
      throw new Error(`マイグレーション v${v} が定義されていません`);
    }

    await db.withTransactionAsync(async () => {
      await migration(db);
    });

    // トランザクション外でバージョンを更新（PRAGMAはトランザクション内で実行不可）
    await setSchemaVersion(db, v);
  }
}
