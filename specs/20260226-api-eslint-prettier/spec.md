# 仕様書: packages/api に ESLint・Prettier を追加

> Issue: https://github.com/k-negishi/workout-plus/issues/156

## 概要

`packages/api` に ESLint と Prettier を導入し、`apps/mobile` と同一の品質基準を monorepo 全体に適用する。

## 背景・目的

- 現状、`packages/api` には lint・format スクリプトが存在しない
- `pnpm lint`（turbo 経由）が API パッケージをスキップしてしまう
- `lint-staged` も mobile のみ対象のため、API の `.ts` ファイルはコミット前チェックが走らない

## 要件

### ESLint 設定

| プラグイン | mobile | API | 理由 |
|---|---|---|---|
| `@typescript-eslint` | ✅ | ✅ | 共通 |
| `eslint-plugin-simple-import-sort` | ✅ | ✅ | 共通 |
| `eslint-plugin-sonarjs` | ✅ | ✅ | 共通 |
| `eslint-plugin-react-hooks` | ✅ | ❌ | React Native 専用 |
| `eslint-plugin-react-native` | ✅ | ❌ | React Native 専用 |
| `eslint-plugin-jest` | ✅ | ❌ | API は vitest を使用 |
| `eslint-plugin-testing-library` | ✅ | ❌ | API テストには不要 |
| `eslint-plugin-vitest` | ❌ | ✅ | API 固有（vitest 推奨ルール） |

共通 ESLint ルール（mobile と同じ）:
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-unused-vars: ['error', { argsIgnorePattern: '^_' }]`
- `simple-import-sort/imports: error`
- `simple-import-sort/exports: error`
- `no-console: ['warn', { allow: ['warn', 'error'] }]`
- `complexity: ['error', 10]`
- `sonarjs/no-duplicate-string: warn`
- `sonarjs/cognitive-complexity: ['error', 15]`

### Prettier 設定

mobile と完全同一:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true
}
```

### package.json スクリプト（追加）

```json
"lint": "eslint .",
"format": "prettier --write 'src/**/*.ts'",
"format:check": "prettier --check 'src/**/*.ts'"
```

### ルート lint-staged（追加）

```json
"packages/api/**/*.ts": [
  "pnpm --filter @workout-plus/api lint --fix",
  "pnpm --filter @workout-plus/api exec prettier --write"
]
```

## 完了条件

- [ ] `pnpm --filter @workout-plus/api lint` がエラーなく通る
- [ ] `pnpm --filter @workout-plus/api format:check` がエラーなく通る
- [ ] `pnpm lint`（turbo 経由）が API を含めて全パッケージ通る
- [ ] lint-staged が API の `.ts` 変更時にも動く
- [ ] 既存の API コードが新ルールに準拠している
