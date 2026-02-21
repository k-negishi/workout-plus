/**
 * expo-sqlite モック
 * 純粋ロジックテスト（"logic" project）用のスタブ。
 * expo-sqlite はESMのみ配布のためbabel-jest環境でパース失敗する。
 * このモックを moduleNameMapper で差し込むことで回避する。
 */
'use strict';

const mockStatement = {
  executeAsync: jest.fn().mockResolvedValue({ rows: [] }),
};

const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  prepareAsync: jest.fn().mockResolvedValue(mockStatement),
  withTransactionAsync: jest.fn().mockImplementation((fn) => fn()),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
  SQLiteDatabase: class MockSQLiteDatabase {},
};
