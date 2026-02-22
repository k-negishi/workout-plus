/**
 * データベースマイグレーション
 * PRAGMA user_version でスキーマバージョンを管理し、
 * withTransactionAsync で原子的にマイグレーションを実行する
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { ALL_CREATE_TABLES, CREATE_INDEXES } from './schema';
import { generateDevWorkoutSeedSQL, generateSeedSQL } from './seed';

/** 現在の最新スキーマバージョン */
const LATEST_VERSION = 4;

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

/** マイグレーション関数の型 */
type Migration = (db: SQLiteDatabase) => Promise<void>;

/** バージョンごとのマイグレーション関数マップ */
const MIGRATIONS: Record<number, Migration> = {
  1: migrateV0ToV1,
  2: migrateV1ToV2,
  3: migrateV2ToV3,
  4: migrateV3ToV4,
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
