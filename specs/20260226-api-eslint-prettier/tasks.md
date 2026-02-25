# タスク: packages/api ESLint・Prettier 導入

> Feature: 20260226-api-eslint-prettier
> Issue: https://github.com/k-negishi/workout-plus/issues/156

## タスク一覧

### T1: devDependencies インストール
**並列**: 不可（後続タスクの前提）

```bash
pnpm --filter @workout-plus/api add -D \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-simple-import-sort \
  eslint-plugin-sonarjs \
  eslint-plugin-vitest \
  prettier
```

- [ ] T1: `packages/api/package.json` の devDependencies に上記パッケージが追加されている

---

### T2: `packages/api/eslint.config.mjs` を新規作成
**並列**: T1 完了後（T3 と並列可）

mobile の設定をベースに React Native 系・jest 系を除去し、vitest プラグインを追加。

- [ ] T2: `packages/api/eslint.config.mjs` が存在する
- [ ] T2: `pnpm --filter @workout-plus/api exec eslint --print-config src/index.ts` が正常終了する

---

### T3: `packages/api/.prettierrc` を新規作成
**並列**: T1 完了後（T2 と並列可）

mobile の `.prettierrc` と同一内容:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true
}
```

- [ ] T3: `packages/api/.prettierrc` が存在する

---

### T4: `packages/api/package.json` にスクリプトを追加
**並列**: T1 完了後（T2・T3 と並列可）

追加スクリプト: `lint`, `format`, `format:check`

- [ ] T4: `pnpm --filter @workout-plus/api lint` が実行できる
- [ ] T4: `pnpm --filter @workout-plus/api format:check` が実行できる

---

### T5: 既存コードの lint エラーを修正
**並列**: 不可（T2・T4 完了後）

`pnpm --filter @workout-plus/api lint --fix` を実行し、自動修正できないエラーを手動修正する。
対象: `src/**/*.ts`, `__tests__/**/*.ts`

- [ ] T5: `pnpm --filter @workout-plus/api lint` がエラー 0 で通る
- [ ] T5: `pnpm --filter @workout-plus/api format:check` がエラー 0 で通る

---

### T6: ルート `package.json` の `lint-staged` に API を追加
**並列**: T4 完了後

```json
"packages/api/**/*.ts": [
  "pnpm --filter @workout-plus/api lint --fix",
  "pnpm --filter @workout-plus/api exec prettier --write"
]
```

- [ ] T6: ルート `package.json` の `lint-staged` に `packages/api/**/*.ts` エントリが存在する

---

### T7: `.github/workflows/ci.yml` に API ステップを追加
**並列**: T5・T6 完了後

現在の CI は mobile のみ対象。API の lint・format:check・test を追加する。

```yaml
- name: Lint (API)
  run: pnpm --filter @workout-plus/api lint

- name: Format check (API)
  run: pnpm --filter @workout-plus/api format:check

- name: Test (API)
  run: pnpm --filter @workout-plus/api test
```

- [ ] T7: CI の `lint-and-test` ジョブに API の 3 ステップが追加されている

---

### T8: 動作確認・CLAUDE.md 更新
**並列**: T7 完了後

```bash
# 全体 lint（turbo 経由）
pnpm lint

# API 単体確認
pnpm --filter @workout-plus/api lint
pnpm --filter @workout-plus/api format:check
pnpm --filter @workout-plus/api test
pnpm --filter @workout-plus/api typecheck
```

CLAUDE.md の「よく使うコマンド」に API コマンドを追記する。

- [ ] T8: `pnpm lint` が全パッケージ通る
- [ ] T8: CLAUDE.md に API の lint/format コマンドが記載されている
- [ ] T8: PR 作成後、CI が全ステップ PASS する

---

## 依存関係

```
T1
├── T2 (並列)
├── T3 (並列)
└── T4 (並列)
    └── T5
        └── T6
            └── T7
                └── T8
```

## 総計

- 総タスク数: 8
- 並列実行可能: T2・T3・T4（T1 完了後に同時実行可）
