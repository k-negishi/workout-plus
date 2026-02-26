import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jest from 'eslint-plugin-jest';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';

export default [
  {
    ignores: ['node_modules/**', '.expo/**', 'babel.config.js', 'metro.config.js', 'tailwind.config.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
      'react-native': reactNative,
      sonarjs,
      // React Hooks ルール: フック呼び出し規則 + 依存配列の完全性チェック
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript 厳格ルール
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // SonarJS バグパターン検出
      // cognitive-complexity を複雑度ゲートとして採用。
      // 標準 complexity ルールは JSX の && や ?. も 1 分岐としてカウントするため
      // React コンポーネントで誤検知が多く廃止した。
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/cognitive-complexity': ['error', 15],
      // React Hooks: フック呼び出し規則（条件分岐内での呼び出し等を禁止）
      'react-hooks/rules-of-hooks': 'error',
      // React Hooks: useFocusEffect/useEffect の依存配列漏れを検出
      // → stale closure 起因のバグを事前検知し、getState() パターンへ誘導する
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    plugins: {
      jest,
      'testing-library': testingLibrary,
    },
    rules: {
      ...jest.configs['recommended'].rules,
      // Testing Library ベストプラクティス
      // （インストール済みだったが未有効化だったため追加）
      ...testingLibrary.configs['react'].rules,
    },
  },
];
