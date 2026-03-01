import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jest from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unicorn from 'eslint-plugin-unicorn';

export default [
  {
    // nativewind-env.d.ts は NativeWind が要求するファイル名のため rename 不可
    ignores: ['node_modules/**', '.expo/**', 'babel.config.js', 'metro.config.js', 'tailwind.config.js', 'nativewind-env.d.ts'],
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
      unicorn,
    },
    rules: {
      // TypeScript 厳格ルール
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
      // ! 使用を warn（233件あるため即 error にしない。段階的に修正）
      '@typescript-eslint/no-non-null-assertion': 'warn',
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
      // warn → error に昇格: stale closure の主要原因を CI で必ず止める
      'react-hooks/exhaustive-deps': 'error',
      // --- React Native 追加ルール ---
      // NOTE: eslint-plugin-react-native@5.0.0 は ESLint 10 と一部非互換
      // （context.getSourceCode is not a function）。以下3ルールは互換修正まで off。
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      'react-native/no-single-element-style-arrays': 'off',
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
      // --- unicorn プラグイン ---
      // RN/Expo 非互換のルールは off に設定
      ...unicorn.configs['recommended'].rules,
      // ファイル名規則: PascalCase（コンポーネント）または camelCase（ユーティリティ）
      // ignore: "AI" は業界標準アクロニムのため例外扱い（AIScreen.tsx, useAIChat.ts 等）
      'unicorn/filename-case': [
        'error',
        { cases: { pascalCase: true, camelCase: true }, ignore: [/AI/] },
      ],
      'unicorn/prevent-abbreviations': 'off',        // props / ref / err / idx 等の略語が多い
      'unicorn/no-null': 'off',                      // RN: StyleSheet / route.params で null が必要
      'unicorn/prefer-module': 'off',                // Expo/babel の CJS 混在
      'unicorn/prefer-node-protocol': 'off',         // RN は node: protocol 非対応
      'unicorn/no-array-reduce': 'off',              // データ集計で正当な用途あり
      'unicorn/prefer-dom-node-append': 'off',       // DOM API なし
      'unicorn/prefer-dom-node-text-content': 'off', // DOM API なし
      'unicorn/prefer-query-selector': 'off',        // DOM API なし
      'unicorn/no-useless-undefined': 'off',         // RN Props のデフォルト値に明示 undefined が便利
      // DB row-to-model 変換関数を .map()/.filter() に直接渡すパターン（リポジトリ層で多用）では
      // TypeScript が厳密に型付けされており false positive が多いため off
      'unicorn/no-array-callback-reference': 'off',
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
      // --- テストファイルでの unicorn 緩和 ---
      // it() / describe() 内にネストしたセットアップ関数は外スコープに出すとテストの
      // 局所性が失われるため off。production コードには引き続き適用。
      'unicorn/consistent-function-scoping': 'off',
      // テストのモック引数ではオブジェクトリテラルをデフォルト値にするパターンが慣習的
      'unicorn/no-object-as-default-parameter': 'off',
      // beforeEach でモックをリセットする際の delete obj[key] パターンを許可
      '@typescript-eslint/no-dynamic-delete': 'off',
      // テストコードでは forEach 記述が慣習的（describe/it ブロック内での繰り返し等）
      'unicorn/no-array-for-each': 'off',
      // jest.requireActual<typeof import('...')> パターンを許可
      // （型アノテーションでの import() 使用: disallowTypeAnnotations のみ緩和）
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
    },
  },
];
