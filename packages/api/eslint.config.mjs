import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import vitest from '@vitest/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
      sonarjs,
      unicorn,
    },
    rules: {
      // TypeScript 厳格ルール（mobile と共通）
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // --- @typescript-eslint/strict 個別追加 ---
      // recommended は維持しつつ、strict から価値が高いルールを個別追加
      '@typescript-eslint/no-dynamic-delete': 'error',        // 型安全でない delete
      '@typescript-eslint/no-extraneous-class': 'error',      // 静的クラスより関数モジュールへ
      '@typescript-eslint/prefer-as-const': 'error',          // リテラル型は as const
      // @ts-ignore には説明文を強制（TS 回避には根拠が必要）
      '@typescript-eslint/ban-ts-comment': ['error', { minimumDescriptionLength: 10 }],
      // import type を強制（バンドルサイズ削減・循環参照回避）
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // ! 使用を warn（段階的に修正）
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 循環的複雑度は sonarjs/cognitive-complexity に一本化（complexity との二重管理を解消）
      // SonarJS バグパターン検出（mobile と共通）
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/cognitive-complexity': ['error', 15],
      // --- unicorn プラグイン ---
      // サーバーサイド（Node.js）向けに調整
      ...unicorn.configs['recommended'].rules,
      // ファイル名規則: camelCase（サーバーサイドは camelCase が標準）
      'unicorn/filename-case': ['error', { cases: { camelCase: true } }],
      'unicorn/prevent-abbreviations': 'off',        // req / res / err / ctx 等の略語が多い
      'unicorn/no-null': 'off',                      // null が必要なケースあり
      'unicorn/prefer-module': 'off',                // ESM/CJS 混在
      'unicorn/prefer-node-protocol': 'off',         // 互換性
      'unicorn/no-array-reduce': 'off',              // データ集計で正当な用途あり
      'unicorn/prefer-dom-node-append': 'off',       // DOM API なし（Node.js）
      'unicorn/prefer-dom-node-text-content': 'off', // DOM API なし（Node.js）
      'unicorn/prefer-query-selector': 'off',        // DOM API なし（Node.js）
      'unicorn/no-useless-undefined': 'off',         // 明示的 undefined が便利なケースあり
      'unicorn/no-process-exit': 'off',              // サーバー終了処理で必要
    },
  },
  {
    // テストファイル: vitest 推奨ルール（mobile の jest 相当）
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
];
