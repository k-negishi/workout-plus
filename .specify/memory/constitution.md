<!--
  Sync Impact Report
  - Version: null → 1.0.0 → 1.1.0
  - 1.0.0: 初回策定（React Native 版）
  - 1.1.0: 原則VI追加（テスト・品質規律）、原則III更新（MVP=スマホ単独）
  - Principles:
    1. ローカルファースト (Local-First)
    2. 引き算のデザイン (Subtractive Design)
    3. MVPスコープ厳守 (MVP Scope Discipline) — v1.1.0 で MVP=スマホアプリ単独を明記
    4. マネージドサービス専用 (Managed Services Only)
    5. 個人開発の持続可能性 (Solo Developer Sustainability)
    6. テスト・品質規律 (Test & Quality Discipline) — v1.1.0 で追加
  - Sections:
    - 技術スタック制約: テスト/Linter/Formatter/Git Hooks 行を追加
    - 開発ワークフロー: 品質ゲートにカバレッジ・lint要件を追加
    - Governance: 変更なし
  - Template consistency:
    - .specify/templates/plan-template.md: ✅ Constitution Check に原則VIが追加対象
    - .specify/templates/spec-template.md: ✅ 変更不要
    - .specify/templates/tasks-template.md: ✅ 変更不要
    - .specify/templates/checklist-template.md: ✅ 変更不要
    - .specify/templates/commands/*.md: ✅ 該当ファイルなし
    - CLAUDE.md: ✅ 整合
  - Follow-up TODOs: なし
-->

# Workout+ Constitution

## Core Principles

### I. ローカルファースト (Local-First)

端末のローカルストレージに即座保存し、オフラインで全機能が完全動作することを最優先とする。

- 書き込みは MUST ローカルDB（SQLite）に即座保存する
- 読み取りは MUST 常にローカルDBから行う
- オフライン状態でもすべての記録・閲覧・編集機能が MUST 動作する
- クラウド同期はバックグラウンドの非同期処理とし、ユーザー操作をブロックしてはならない
- バックアップはiCloud / Google Driveへの暗号化DBファイル保存で対応する

**根拠**: ジムなど電波の不安定な環境での使用が主であり、ネットワーク依存はUXを直接損なう。ローカルファーストにより「常に使える」信頼性を担保する。

### II. 引き算のデザイン (Subtractive Design)

「足す」より「削る」方向で設計する。実用性とクリーンさを最優先とし、過剰な装飾を排除する。

- UIデザインは MUST 機能的な実用性を最優先とする
- グラデーション使用禁止（ベタ塗りのみ）
- シャドウは最小限（境界線を使う）
- border-radius は3種類まで（6px, 8px, 12px）
- font-weight は3種類（400, 600, 700）
- padding は 4px の倍数
- デザイン候補を提案する際は MUST 軽い方向から順に提案する（ミニマル → 標準 → リッチ）
- 「AIっぽい」デザイン（過剰なグラデーション、多すぎるシャドウ、不統一なborder-radius）は禁止

**根拠**: ワークアウト記録アプリは操作効率が命。装飾に注力するよりも、ジムで片手操作で素早く記録できるクリーンなUIが価値を生む。

### III. MVPスコープ厳守 (MVP Scope Discipline)

「やらないことを決める」ことを最重要方針とし、MoSCoW法のMust項目のみにスコープを限定する。

- MVP は MUST スマホアプリ単独で完結する（サーバーサイド・認証・課金・クラウド同期は MVP 対象外）
- MVP には MUST MoSCoW法の Must 項目のみを含める
- 新機能追加の提案時は MUST 現在のフェーズスコープとの適合を確認する
- スコープ外の機能は MUST Deferred セクションに文書化し、優先度を付与する
- 「将来的に対応」の機能は設計考慮のみ行い、実装には着手しない
- 完璧を目指さず、動くものを早く出すことを優先する

**根拠**: 個人開発でスコープクリープは致命的。まずローカル完結のスマホアプリをリリースし、フィードバックを得ながらサーバーサイドを拡張する戦略が最も効率的。

### IV. マネージドサービス専用 (Managed Services Only)

サーバー管理は一切行わない。すべてのインフラをマネージドサービスとIaCで構成する。

- サーバー（EC2/ECS等）の使用は禁止。Lambda + DynamoDB + API Gateway で完結する
- 認証は MUST 外部委譲する（Amazon Cognito + Apple/Google Sign-In）
- 課金は MUST 外部委譲する（RevenueCat + Apple/Google IAP）
- 全インフラは MUST Terraform（HCL）でコード管理する
- 監視は CloudWatch 中心とし、追加SaaSは最小限にする

**根拠**: 1名体制でサーバー運用は持続不可能。マネージドサービスにより運用負荷をゼロに近づけ、開発に集中する。

### V. 個人開発の持続可能性 (Solo Developer Sustainability)

1名で開発・運用を持続できるアーキテクチャと開発プロセスを選択する。

- モノレポ構成を MUST 維持する（pnpm workspaces + Turborepo でリポジトリ分割のオーバーヘッド回避）
- 管理画面は最小構成とする（必要最小限の画面のみ）
- CI/CD は path filter でスコープを限定し、ビルド時間を最小化する
- 技術選択時は MUST 運用コスト（金銭・時間・認知負荷）を評価軸に含める
- バーンアウト防止: 週次スプリント制、持続可能なペースを維持する

**根拠**: 個人開発の最大のリスクは「続かないこと」。技術的に高度な構成より、1人で長期運用できる構成を優先する。

### VI. テスト・品質規律 (Test & Quality Discipline)

自動テスト・静的解析・フォーマッターを必須とし、コード品質を機械的に担保する。

- 自動テストは MUST 全機能に対して記述する
- テストカバレッジは MUST 90%以上を維持する（CI で閾値チェック）
- ESLint は MUST 厳格設定で適用する（`@typescript-eslint/strict-type-checked` + 追加ルール）
- Prettier は MUST 全ファイルに適用する（CI で差分チェック）
- コミット前に MUST lint + format チェックを通過する（lint-staged + husky）
- テストが落ちている状態での main マージは禁止

**根拠**: 個人開発ではコードレビューアが不在。厳格なリンター・フォーマッター・自動テストがレビューアの代わりとなり、品質の劣化を防ぐ。90%カバレッジによりリグレッションを早期検出し、安心してリファクタリングできる土台を作る。

## 技術スタック制約

| レイヤー | 技術 | 備考 |
|----------|------|------|
| モバイル | React Native (TypeScript) | Expo managed workflow。iOS 16+ / Android 10+ |
| ローカルDB | SQLite (expo-sqlite または WatermelonDB) | ローカルファースト原則の中核 |
| サーバーサイド | AWS Lambda (TypeScript) | ARM64 (Graviton2) |
| API | API Gateway (HTTP API) | Cognito JWT 認証統合 |
| DB | DynamoDB (On-Demand) | シングルテーブル設計 |
| 認証 | Amazon Cognito | Apple/Google/Email Sign-In |
| AI | Amazon Bedrock (Claude) | IAM ロール認証（キーレス） |
| IaC | Terraform (HCL) | S3 + DynamoDB Lock backend |
| リポジトリ | Git モノレポ | pnpm workspaces + Turborepo |
| 管理画面 | Next.js (TypeScript) | Vercel Hobby |
| 課金 | RevenueCat | Apple/Google IAP 統合 |
| CI/CD | GitHub Actions | path filter 適用 |
| テスト | Jest + React Native Testing Library | カバレッジ閾値 90% |
| Linter | ESLint (strict-type-checked) | 厳格設定。警告ゼロ運用 |
| Formatter | Prettier | 全ファイル統一フォーマット |
| Git Hooks | husky + lint-staged | コミット前に lint + format 強制 |

**カラーシステム**:
- メインカラー: #4D94FF
- プライマリダーク: #3385FF / プライマリ背景: #E6F2FF
- テキスト: #475569（primary） / #64748b（secondary）
- ボーダー: #e2e8f0 / 背景: #f9fafb / 成功色: #10B981
- フォント: Noto Sans JP

## 開発ワークフロー

### Speckit ワークフロー

機能開発は以下のフローに従う:

1. `/speckit.specify` — 仕様書作成（ユーザーシナリオ・要件・成功基準）
2. `/speckit.clarify` — 曖昧点の特定と解消（最大5問）
3. `/speckit.plan` — 実装計画策定（技術選定・構造設計・依存関係）
4. `/speckit.tasks` — タスク分解（依存関係順・並列可能性明示）
5. `/speckit.implement` — 実装実行

### ブランチ戦略

- メインブランチ: `main`
- 機能ブランチ: `feature/###-feature-name` 形式（3桁ゼロ埋め番号）
- 仕様ディレクトリ: `specs/###-feature-name/`

### 品質ゲート

- 仕様書は MUST 品質チェックリスト（`checklists/requirements.md`）を通過する
- 実装計画は MUST コンスティテューションチェックを含む
- タスクは MUST ユーザーストーリー単位で独立テスト可能に分解する
- コードは MUST ESLint エラーゼロ・Prettier 差分ゼロで CI を通過する
- テストカバレッジは MUST 90%以上で CI を通過する

## Governance

本コンスティテューションはプロジェクトの全設計判断において最上位の指針とする。

- 原則に反する設計判断を行う場合は MUST 根拠を文書化し、Complexity Tracking に記載する
- 修正は MUST セマンティックバージョニングに従い、変更理由と影響範囲を記録する
- ランタイム開発ガイダンスは CLAUDE.md に記載する
- 原則の追加・変更・削除は本ファイルを更新し、依存テンプレートとの整合性を検証する

**Version**: 1.1.1 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-21
