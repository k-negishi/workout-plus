import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jest from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
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
      react,
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
      // --- スキルドキュメントからの lint 昇格ルール ---
      // coding-rules スキル: enum キーワード禁止 → as const パターンを強制
      // enum は tree-shaking 不可・ビット演算と混同しやすいため
      // React Native: Text コンポーネント外の文字列リテラルはクラッシュ
      // expo-runtime スキル: Pressable + style 関数 / AbortSignal.timeout() 禁止
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            'enum キーワードは禁止です。as const パターンを使ってください（coding-rules スキル参照）。',
        },
        {
          selector:
            "MemberExpression[object.name='AbortSignal'][property.name='timeout']",
          message:
            'AbortSignal.timeout() は Hermes エンジンに未実装です。AbortController + setTimeout + try/finally で代替してください（expo-runtime スキル参照）。',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Pressable'] > JSXAttribute[name.name='style'] > JSXExpressionContainer > :matches(ArrowFunctionExpression, FunctionExpression)",
          message:
            'Pressable の style 関数は NativeWind v4 で実機に反映されません。TouchableOpacity + 静的スタイルオブジェクト（activeOpacity={0.7}）に切り替えてください（expo-runtime スキル参照）。',
        },
      ],
      // react-native/no-raw-text: Text コンポーネント外の文字列リテラルを禁止
      // React Native では View 等に直接文字列を書くとクラッシュする
      'react-native/no-raw-text': ['error', { skip: ['Text'] }],
      // react/jsx-no-leaked-render: {count && <Text>} パターンを禁止
      // count = 0 のとき "0" が Text 外に描画されて React Native がクラッシュする
      'react/jsx-no-leaked-render': 'error',
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
