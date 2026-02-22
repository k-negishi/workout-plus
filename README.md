# workout-plus

筋トレ記録アプリ。Expo (React Native) + TypeScript + SQLite のモノレポ構成。

## 開発ワークフロー

### 仕様策定 → 実装の標準フロー

```
specify → clarify → plan → tasks → [taskstoissues] → implement
```

| ステップ | コマンド | 内容 | 成果物 |
|---|---|---|---|
| 1. 仕様書作成 | `/speckit.specify` | 未定義領域を洗い出し仕様書を生成 | `specs/<feature>/spec.md` |
| 2. 仕様の明確化 | `/speckit.clarify` | 未定義領域を最大5問で質問・仕様に反映 | `specs/<feature>/spec.md`（更新） |
| 3. 実装計画 | `/speckit.plan` | アーキテクチャ・依存関係を設計 | `specs/<feature>/plan.md` |
| 4. タスク生成 | `/speckit.tasks` | 依存関係順・並列可否付きのタスクを生成 | `specs/<feature>/tasks.md` |
| 5. Issue化 | `/speckit.taskstoissues` | tasks.md を GitHub Issues に変換 | GitHub Issues |
| 6. 実装 | `/speckit.implement` | tasks.md の全タスクを順次・並列実行 | 実装コード・テスト |

### 品質チェック

```
analyze → checklist
```

| コマンド | 内容 | 成果物 |
|---|---|---|
| `/speckit.analyze` | spec・plan・tasks の横断的な整合性チェック（非破壊） | コンソール出力（ファイル変更なし） |
| `/speckit.checklist` | 機能に合わせたカスタムチェックリストを生成 | `specs/<feature>/checklists/requirements.md` |

---

## よく使うコマンド

### 開発

```bash
# モバイルアプリを起動（Expo Go）
pnpm --filter mobile start

# iOS シミュレーター（--localhost 固定済み。LAN IP だとタイムアウトするため）
pnpm --filter mobile ios

# Android エミュレーター
pnpm --filter mobile android

# SQLite データをクリアして起動（Expo Go ごと削除→再インストール）
xcrun simctl uninstall booted host.exp.Exponent && pnpm --filter mobile ios
```

### 品質チェック

```bash
# 全パッケージ Lint
pnpm lint

# モバイルのみ Lint（自動修正あり）
pnpm --filter mobile lint --fix

# 全パッケージテスト
pnpm test

# カバレッジ付き（目標: 90%+）
pnpm --filter mobile test --coverage

# 型チェック
pnpm --filter mobile tsc --noEmit
```

### ビルド

```bash
# 全パッケージビルド
pnpm build
```

---

## ディレクトリ構成

```
workout-plus/
├── apps/
│   └── mobile/          # Expo アプリ本体
├── packages/
│   └── shared/          # 型定義・共通ロジック（将来用）
├── specs/               # 機能仕様書（speckit で管理）
│   └── 001-workout-core-screens/
│       ├── spec.md      # 機能仕様
│       ├── plan.md      # 実装計画
│       ├── tasks.md     # タスク一覧
│       └── data-model.md
└── requirements/        # デザインシステム・要件ドキュメント
```

---

## 技術スタック

- **フレームワーク**: Expo SDK 54 / React Native 0.81
- **言語**: TypeScript (strict mode)
- **DB**: expo-sqlite（SQLite、WAL モード）
- **状態管理**: Zustand
- **ナビゲーション**: React Navigation 7
- **スタイル**: NativeWind v4
- **テスト**: Jest + React Native Testing Library（カバレッジ目標 90%）
- **モノレポ**: pnpm workspaces + Turborepo

## 注意事項

- ネイティブモジュールのバージョンは `^`（caret）禁止 → `~` か厳密固定（Expo Go 制約）
- `npx expo install --fix` で互換バージョンを確認
- Hermes エンジンには `crypto.getRandomValues` がない → `src/polyfill.ts` で補完
