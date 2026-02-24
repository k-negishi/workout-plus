import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

/**
 * .js 拡張子で import された TypeScript ソースを解決するプラグイン
 *
 * ESM の慣習では実装ファイルが `.ts` でも import 時は `.js` と書く。
 * Vitest がモジュールをロードする際に `.js` の物理ファイルが存在しない場合、
 * 同名の `.ts` ファイルを試みるようにフォールバックする。
 */
function jsToTsResolverPlugin() {
  return {
    name: 'js-to-ts-resolver',
    resolveId(id: string, importer: string | undefined) {
      if (!id.endsWith('.js') || !importer) return null;
      const tsPath = id.replace(/\.js$/, '.ts');
      // 絶対パスに変換
      const resolved = path.resolve(path.dirname(importer), tsPath);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [jsToTsResolverPlugin()],
  test: {
    // Node.js Lambda パッケージのためブラウザ環境不要
    environment: 'node',
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'], // Lambda ハンドラーは統合テストで確認
    },
  },
});
