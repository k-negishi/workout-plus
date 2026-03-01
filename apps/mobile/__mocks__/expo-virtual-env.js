/**
 * expo/virtual/env のモック（Jestテスト環境用）
 *
 * babel-preset-expo は process.env.EXPO_PUBLIC_* を
 * `expo/virtual/env` からのインポートに変換するが、
 * jest の logic プロジェクトでは ESM が使えないため CJS モックで差し替える。
 * env オブジェクトは process.env への参照を保持するため、
 * テスト内で process.env.EXPO_PUBLIC_* を変更すると即座に反映される。
 */
module.exports = {
  env: process.env,
};
