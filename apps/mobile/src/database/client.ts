/**
 * SQLiteデータベースクライアント
 * シングルトンパターンで一度だけ初期化する
 */
import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

const DB_NAME = 'workout.db';

/** DBインスタンスのシングルトン */
let db: SQLite.SQLiteDatabase | null = null;

/**
 * データベースを初期化して返す
 * 初回呼び出し時にDB接続・WALモード有効化・マイグレーションを実行する
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  const database = await SQLite.openDatabaseAsync(DB_NAME);

  // WALモードを有効化（読み書き並行性能の向上）
  await database.execAsync('PRAGMA journal_mode = WAL');

  // 外部キー制約を有効化
  await database.execAsync('PRAGMA foreign_keys = ON');

  // マイグレーション実行
  await runMigrations(database);

  db = database;
  return db;
}
