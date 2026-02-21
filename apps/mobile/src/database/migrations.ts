/**
 * データベースマイグレーション
 * PRAGMA user_version でスキーマバージョンを管理し、
 * withTransactionAsync で原子的にマイグレーションを実行する
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { ALL_CREATE_TABLES, CREATE_INDEXES } from './schema';
import { generateSeedSQL } from './seed';

/** 現在の最新スキーマバージョン */
const LATEST_VERSION = 1;

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

/** マイグレーション関数の型 */
type Migration = (db: SQLiteDatabase) => Promise<void>;

/** バージョンごとのマイグレーション関数マップ */
const MIGRATIONS: Record<number, Migration> = {
  1: migrateV0ToV1,
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
