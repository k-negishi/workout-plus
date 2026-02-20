# Workout+（筋トレ記録・ワークアウト管理）企画書 v3

> **Flutter · AWS Serverless · Terraform · Git Monorepo**
>
> Version 3.0 | 2026.02.16 | 個人開発 · 1名体制

---

## 1. エグゼクティブサマリー

個人開発者1名が、Flutter + AWSサーバーレスで筋トレ記録アプリ **Workout+** をiOS/Android向けに開発する。インフラはTerraformでコード管理し、アプリ・API・管理画面・インフラをGitモノレポで一元管理する。

| 項目 | 内容                                                           |
|---|--------------------------------------------------------------|
| ホーム画面表示名 | **Workout+**                                                 |
| App Storeタイトル | **Workout+ – 筋トレ記録・ワークアウト管理**                                |
| リポジトリ名 | `workout-plus`                                               |
| 対応OS | iOS 16+ / Android 10+                                        |
| 開発体制 | 個人開発 1名（AWS経験あり）                                             |
| モバイル | Flutter (Dart) — SkiaレンダリングでピクセルパーフェクトUI                     |
| サーバーサイド | AWS Lambda (TS) / API Gateway / DynamoDB / Cognito / Bedrock |
| IaC | Terraform (HCL) — tfstate: S3 + DynamoDB Lock                |
| リポジトリ | Gitモノレポ — Melos (Flutter) + pnpm workspaces (TS)             |
| 管理画面 | Next.js (TS). Vercel Hobby（無料）か、AWS Lambda (TS) はTBD         |
| 課金 | RevenueCat + Apple/Google IAP                                |
| 初期コスト | **月額 ~$5**（AWS Free Tier活用）                                  |

---

## 2. プロダクトビジョン

### 2.1 コンセプト

**「記録が続くから、成長が見える」**

最小限の操作で日々のトレーニングを記録し、AIが個人に最適化されたアドバイスを提供するアプリ。既存アプリの課題である「UIの複雑さ」「オフライン対応の弱さ」「AIパーソナライズの欠如」を解決する。

### 2.2 ターゲットペルソナ

| ペルソナ | 年齢/性別 | 特徴 | ニーズ |
|---|---|---|---|
| 初心者タロウ | 25歳/男性 | ジム通い開始3ヶ月 | 何をすればいいかわからない |
| 中級者サクラ | 32歳/女性 | 週4回トレーニング | 記録を振り返り成長を可視化したい |
| 多忙リーマン | 38歳/男性 | 限られた時間で効率化 | AIで最適メニュー提案がほしい |

### 2.3 個人開発における設計方針

1人で開発・運用を持続するには「やらないことを決める」ことが最重要。

| 原則 | 具体策 |
|---|---|
| マネージドサービス最大活用 | EC2/ECS等のサーバー管理は一切しない。Lambda + DynamoDB + API Gatewayで完結 |
| IaC（Infrastructure as Code） | Terraform (HCL) で全インフラをコード管理。再現性と変更追跡を確保 |
| 認証は自前実装しない | Amazon Cognito + Apple/Google Sign-In。セキュリティリスクを外部委譲 |
| 課金は自前実装しない | RevenueCat でApple/Google IAP統合。Webhook→Lambda→DynamoDB で状態同期 |
| 管理画面は最小構成 | Vercel + Next.js SPA。初期は必要最小限の画面のみ |
| 監視はCloudWatch中心 | 追加SaaSは最小限。CloudWatch Alarms + Chatbot → Slack通知 |

---

## 3. ユーザーストーリー

「〜として、〜したい。なぜなら〜だから」形式で記述。優先度はMoSCoW法で分類し、MVPスコープはMustのみとする。

### 3.1 トレーニング記録

| ID | ペルソナ | ストーリー | 受入条件 | 優先 |
|---|---|---|---|---|
| US01 | 初心者 | トレーニングを素早く記録したい。ジムでサクッと入力できないと続かないから | ・種目選択→ 3タップ以内で完了 ・重量/回数/セット数入力可 ・前回記録がデフォルト表示 | **Must** |
| US02 | 初心者 | トレーニングにメモを残したい。フォームの気づきや体調を後で振り返りたいから | ・各セットにテキストメモ添付可 ・ワークアウト全体にメモ添付可 | **Must** |
| US03 | 中級者 | ワークアウトテンプレートを作りたい。毎回同じメニューをゼロから入力するのは面倒だから | ・種目・セット構成をテンプレ保存 ・テンプレからワンタップで開始 | Should |
| US04 | 全ユーザー | インターバルタイマーを使いたい。休憩時間を管理してトレーニングの質を保ちたいから | ・カウントダウン表示 + バイブ通知 ・デフォルト秒数カスタマイズ可 | **Must** |
| US05 | 中級者 | スーパーセットやドロップセットを記録したい。通常セットだけではトレーニング内容を正確に表現できないから | ・セット種別タグ選択可 ・統計にセット種別が反映 | Could |

### 3.2 閲覧・分析

| ID | ペルソナ | ストーリー | 受入条件 | 優先 |
|---|---|---|---|---|
| US06 | 初心者 | カレンダーでトレーニング日を確認したい。継続できているか一目でわかりたいから | ・トレ日がドット表示 ・連続日数ストリーク表示 ・日付タップで詳細表示 | **Must** |
| US07 | 中級者 | 筋肉部位別のボリュームを確認したい。弱い部位を見つけてバランスよく鍛えたいから | ・胸/背/脚等の部位別ボリュームチャート ・週次/月次切り替え | Should |
| US08 | 中級者 | 種目ごとの重量推移グラフを見たい。成長を実感してモチベーションを保ちたいから | ・種目選択で折れ線グラフ表示 ・1RM推定値の推移も表示 | Should |
| US09 | 全ユーザー | ダッシュボードで今週のサマリーを見たい。アプリを開いたらすぐ状況がわかるようにしたいから | ・今週のトレ回数/総ボリューム ・前週比較↑↓表示 | **Must** |

### 3.3 データ管理・同期

| ID | ペルソナ | ストーリー | 受入条件 | 優先 |
|---|---|---|---|---|
| US10 | 全ユーザー | データを端末に安全に保存したい。オフラインでも完全に使えることが重要だから | ・SQLiteに即座保存 ・オフラインで全機能動作 ・オンライン復帰時に自動同期 | **Must** |
| US11 | 全ユーザー | iCloud/Google Driveにバックアップしたい。機種変でデータを失いたくないから | ・手動バックアップボタン ・復元機能あり ・DBファイル暗号化保存 | **Must** |
| US12 | Pro | 複数デバイスでデータを同期したい。スマホとタブレット両方で使いたいから | ・クラウド経由で自動同期 ・コンフリクト時は最新優先+通知 ・同期状態インジケーター | Should |

### 3.4 認証・課金

| ID | ペルソナ | ストーリー | 受入条件 | 優先       |
|---|---|---|---|----------|
| US13 | 全ユーザー | Apple/Googleアカウントで簡単にログインしたい。新規登録の手間を最小にしたいから | ログインなしでもローカル利用可 | **Must** |
| US14 | 全ユーザー | Proプランにアップグレードしたい。AI機能や詳細分析を使いたいから | ・アプリ内課金UI表示 ・月額/年額選択可 ・購入即時反映 ・復元ボタンあり | 将来的にやる   |
| US15 | Free | Pro機能を試してから購入を決めたい。いきなり課金は不安だから | ・7日間無料トライアル ・トライアル終了前に通知 ・自動課金開始前に確認 | Should   |

### 3.5 AIアシスタント

| ID | ペルソナ | ストーリー | 受入条件 | 優先     |
|---|---|---|---|--------|
| US16 | 初心者 | AIに今日のメニューを提案してほしい。何をすればいいかわからないから | ・目標/経験/履歴を考慮した提案 ・提案メニューをワンタップで開始 ・Free: 3回/日, Pro: 無制限 | Should |
| US17 | 全ユーザー | AIにトレーニングや栄養について質問したい。専門家に聞く感覚で気軽に相談したいから | ・チャットUIで自由質問 ・過去のトレーニングデータをコンテキストに回答 ・履歴保持 | Should |
| US18 | Pro | AIにフォームのアドバイスがほしい。ケガ防止や効率改善のヒントがほしいから | ・種目別のポイント提示 ・ユーザーの記録パターンから個別改善提案 | 将来的にやる |

### 3.6 管理者（自分）

| ID | ペルソナ | ストーリー | 受入条件 | 優先 |
|---|---|---|---|---|
| US19 | 運営者 | KPIをダッシュボードで確認したい。アプリの健全性を毎日チェックしたいから | ・DAU/MAU/課金率/ARPU表示 ・日次推移グラフ ・リテンションカーブ | Should |
| US20 | 運営者 | AIプロンプトを管理画面から更新したい。デプロイなしでA/Bテストしたいから | ・プロンプト編集/バージョニング ・A/Bテスト設定 ・トークン使用量確認 | Could |
| US21 | 運営者 | ユーザーにプッシュ通知を送りたい。新機能告知やリマインドでリテンションを改善したいから | ・セグメント別配信可 ・配信予約可 ・開封率トラッキング | Could |

### 3.7 MVPスコープマトリクス

Mustのみを抽出したMVPスコープ:

| 領域 | MVPスコープ (Must) | ストーリー |
|---|---|---|
| 記録 | 種目選択・重量/回数/セット入力・メモ・タイマー | US01, 02, 04 |
| 閲覧 | カレンダービュー・ダッシュボード（基本統計） | US06, 09 |
| データ | ローカル保存・iCloud/GDriveバックアップ | US10, 11 |

要は、課金機能はまだ実装しない。将来的な課金を見越した開発をする。

---

## 4. 機能一覧

### 4.1 Freeプラン

- トレーニング記録（種目・重量・回数・セット数・メモ）
- カレンダービュー / 基本統計ダッシュボード
- ローカルデータ保存（SQLite / drift）
- iCloud / Google Driveバックアップ（手動）
- 種目マスタ（300種目+プリセット）/ インターバルタイマー
- AIお試し（3回/日の制限は将来的にやる）

### 4.2 Proプラン（月額480円 / 年額3,800円）
将来的にやるので、将来やることを見越してください。

- AIトレーナー無制限（メニュー提案・チャット・栄養アドバイス）
- 詳細分析（1RM推定・筋群別ボリューム・疲労度推定）
- 自動クラウド同期（複数デバイス対応）
- カスタムテンプレート無制限 / CSV・PDFエクスポート
- 広告非表示

### 4.3 管理画面（自分用）

- KPIダッシュボード（DAU/MAU・課金率・ARPU・リテンション）
- ユーザー管理 / 種目マスタ管理 / プッシュ通知配信
- AIプロンプト管理（バージョニング・A/Bテスト）
- お知らせ・FAQ管理

---

## 5. 課金設計

RevenueCatを採用し、Apple App Store / Google Play StoreのIn-App Purchase（IAP）を統合管理する。

| プラン | Free | Pro（月額） | Pro（年額） |
|---|---|---|---|
| 価格 | ¥0 | ¥480/月 | ¥3,800/年（34%割引） |
| AI質問 | 3回/日 | 無制限 | 無制限 |
| クラウド同期 | 手動 | 自動リアルタイム | 自動リアルタイム |
| 詳細分析 | 基本のみ | 全機能 | 全機能 |

**課金フロー:**

```
[ユーザー] → App Store / Google Play で購入
    ↓
[RevenueCat] ← レシート検証 → Apple/Google
    ↓ Webhook (課金イベント)
[API Gateway] → [Lambda] → DynamoDB (課金状態更新)
    ↓
[Flutter App] ← RevenueCat SDK で課金状態をリアルタイム反映
```

---

## 6. AWS サーバーレスインフラ構成

個人開発×AWS経験者の強みを最大化する、フルサーバーレス構成。全インフラをTerraformでコード管理する。

### 6.1 アーキテクチャ図

```
[Flutter App (iOS / Android)]
    │
    ├── SQLite (drift) ── ローカル保存 (オフライン完全対応)
    ├── iCloud / Google Drive ── DBファイル暗号化バックアップ
    ├── RevenueCat SDK ── 課金状態管理
    │
    └── [Amazon API Gateway (HTTP API)]
            │
            ├── [Amazon Cognito] ── 認証 (Apple/Google/Email)
            │
            ├── [AWS Lambda (Node.js/TS)]
            │       ├── ワークアウト CRUD API
            │       ├── AI Proxy → Amazon Bedrock (Claude)
            │       ├── RevenueCat Webhook Handler
            │       └── Push通知トリガー
            │
            ├── [Amazon DynamoDB] ── メインDB (On-Demand)
            ├── [Amazon S3] ── 画像 / エクスポート / プロンプト
            ├── [Amazon SNS] → FCM / APNs
            └── [CloudWatch] ── ログ / アラーム → Slack

[Next.js + Vercel] ── 管理画面
    └── API Gateway 経由で同じLambda/DynamoDBを利用
```

### 6.2 AWSサービス詳細

| レイヤー | AWSサービス | 用途 & 選定理由 | 月額コスト目安 |
|---|---|---|---|
| API | API Gateway (HTTP API) | RESTエンドポイント。HTTP APIはREST APIの約70%安。Cognito JWT認証ネイティブ統合 | $0 (Free Tier: 100万リクエスト/月 x12) |
| コンピュート | Lambda (Node.js/TS) | 全API処理。ARM64 (Graviton2) で約20%安。サーバー管理不要 | $0 (Free Tier: 100万リクエスト + 40万GB秒) |
| DB | DynamoDB (On-Demand) | シングルテーブル設計。On-Demandで未使用時$0。自動スケール。PITR無料(35日) | $0 (Free Tier: 25GB + 25 WCU/RCU) |
| 認証 | Cognito | Apple/Google/Emailサインイン。JWT発行→API GWでネイティブJWT検証 | $0 (50,000 MAUまで無料) |
| AI | Bedrock (Claude) | Lambda→Bedrock Runtime API。IAMロール認証でキーレス。請求AWS一本化 | 従量制 (~$5/月 MVP時) |
| ストレージ | S3 | プロフィール画像・エクスポート・AIプロンプトテンプレート | $0.023/GB (Free Tier: 5GB) |
| 通知 | SNS → FCM/APNs | Lambda→SNSでプッシュ送信。クロスプラットフォーム対応 | $0 (100万通知まで無料) |
| 監視 | CloudWatch + Chatbot | メトリクス/ログ/アラーム → Slack通知。AWS Budgetsでコストアラート | $0 ~ $5/月 |
| IaC | Terraform | HCLで全インフラ定義。tfstate: S3 + DynamoDB Lock。GitHub Actionsでplan/apply | $0 (ツール無料) |
| 課金 | RevenueCat (外部) | Apple/Google IAP統合。Webhook→Lambda→DynamoDBで状態同期 | $0 → 売上$2,500超で1% |

### 6.3 フェーズ別月額コスト試算

| 項目 | Phase 1: MVP ~1,000 MAU | Phase 2: Growth ~10,000 MAU | Phase 3: Scale ~50,000 MAU |
|---|---|---|---|
| Lambda | $0 | ~$5 | ~$30 |
| API Gateway | $0 | ~$3 | ~$15 |
| DynamoDB | $0 | ~$10 | ~$50 |
| Cognito | $0 | $0 | $0 |
| Bedrock (AI) | ~$5 | ~$100 | ~$800 |
| S3 / SNS / CW | $0 | ~$7 | ~$25 |
| Vercel | $0 (Hobby) | $0 | $20 (Pro) |
| RevenueCat | $0 | $0~$99 | 売上の1% |
| **合計（月額）** | **~$5/月** | **~$224/月** | **~$940/月** |

> AWS Free Tierは12ヶ月有効（一部は永続無料）。MVP段階では実質AI APIのコストのみ。

### 6.4 AI機能: Amazon Bedrock

| 評価軸 | Anthropic API 直接 | Amazon Bedrock (Claude) |
|---|---|---|
| セットアップ | APIキー取得のみ | AWSコンソールで有効化。IAMで制御 |
| コスト | 入力$3/M・出力$15/M (Sonnet) | やや割高だがAWS請求に一本化 |
| AWS統合 | Lambda内でHTTPコール | AWS SDK直接。IAMロール認証。VPCエンドポイント可 |
| APIキー管理 | Secrets Manager ($0.40/月) | **不要（IAMロールで認証）** |
| 推奨度 | ★★★★ | **★★★★★** |

**推奨: Amazon Bedrock。** IAMロールでAPIキーレスに認証でき、請求もAWSに統一。CloudWatchでトークン使用量の監視・アラームも統合可能。

---

## 7. ローカル ↔ クラウド データフロー

### 7.1 保存方針: ローカルファースト

端末のSQLite（drift）に即座に保存し、バックグラウンドでAWSに差分同期する。オフラインでも完全に動作することを最優先とする。

- **書き込み:** SQLite → DynamoDB（非同期バッチ同期。差分のみ送信）
- **読み取り:** 常にローカルSQLiteから。サーバーデータはバックグラウンド同期でローカルに反映
- **コンフリクト解決:** タイムスタンプベースのLast Write Wins。ワークアウト単位でマージ
- **バックアップ:** iCloud（iOS）/ Google Drive（Android）にSQLite DBファイルを暗号化保存

### 7.2 DynamoDB シングルテーブル設計

#### アクセスパターン一覧

| # | アクセスパターン | キー条件 | 対応 US |
|---|---|---|---|
| AP1 | ユーザープロフィール取得 | userId | US13 |
| AP2 | 特定日のワークアウト取得 | userId + date | US01 |
| AP3 | 日付範囲でワークアウト一覧取得 | userId + dateRange | US06, 09 |
| AP4 | ワークアウト内の全セット取得 | workoutId | US01 |
| AP5 | 種目別の履歴取得（重量推移） | userId + exerciseId | US08 |
| AP6 | 種目マスタ一覧（カテゴリ別） | category | US01 |
| AP7 | 課金ステータス取得 | userId | US14 |
| AP8 | AIチャット履歴取得（最新N件） | userId + 降順 | US17 |
| AP9 | テンプレート一覧取得 | userId | US03 |
| AP10 | 同期対象データ取得（最終同期以降） | userId + lastSyncAt以降 | US12 |
| AP11 | プロンプトテンプレ取得（アクティブ版） | promptType + active | US20 |
| AP12 | 管理: DAU/MAU集計 | 日付範囲 | US19 |

#### テーブル定義

テーブル名: `workoutplus-{env}-main`

| エンティティ | PK | SK | 主要属性 | 対応 AP |
|---|---|---|---|---|
| User | `USER#<userId>` | `PROFILE` | name, email, goal, createdAt, updatedAt | AP1 |
| Subscription | `USER#<userId>` | `SUB` | plan, status, expiresAt, rcCustomerId | AP7 |
| Workout | `USER#<userId>` | `WO#<YYYY-MM-DD>#<ulid>` | date, duration, totalVolume, muscleGroups, memo, syncedAt | AP2, AP3, AP10 |
| Set | `WO#<workoutId>` | `SET#<order>` | exerciseId, weight, reps, setType, memo | AP4 |
| ExerciseHistory | `USER#<userId>` | `EXHIST#<exerciseId>#<YYYY-MM-DD>` | maxWeight, max1RM, totalVolume | AP5 |
| Exercise (master) | `EXERCISE` | `EX#<category>#<id>` | name, nameEn, category, muscleGroup, equipment | AP6 |
| Template | `USER#<userId>` | `TMPL#<id>` | name, exercises[], createdAt | AP9 |
| ChatMessage | `USER#<userId>` | `CHAT#<timestamp>` | role, content, tokenCount | AP8 |
| Prompt | `PROMPT` | `PT#<type>#<version>` | template, isActive, abTestGroup | AP11 |
| DailyStats | `STATS` | `DAY#<YYYY-MM-DD>` | dau, newUsers, proConversions, revenue | AP12 |

#### GSI（グローバルセカンダリインデックス）

| GSI名 | PK | SK | 用途 |
|---|---|---|---|
| GSI1 | `syncedAt` (sparse) | `PK` (元テーブル) | 同期対象データの効率的取得 |
| GSI2 | `exerciseId` | `date` | 種目横断の履歴検索 |

---

## 8. Gitモノレポ構成

アプリ・API・管理画面・インフラを1リポジトリで管理する。個人開発ではリポ分割のオーバーヘッドが大きいため、モノレポが最適。

### 8.1 ディレクトリ構成

```
workout-plus/
├── apps/
│   ├── mobile/              # Flutterアプリ (Dart)
│   │   ├── lib/
│   │   ├── ios/
│   │   ├── android/
│   │   └── pubspec.yaml
│   │
│   └── admin/               # Next.js管理画面 (TypeScript)
│       ├── src/
│       ├── package.json
│       └── vercel.json
│
├── packages/
│   ├── api/                 # Lambda関数群 (TypeScript)
│   │   ├── src/
│   │   │   ├── handlers/    # Lambdaハンドラー
│   │   │   ├── services/    # ビジネスロジック
│   │   │   └── repositories/ # DynamoDBアクセス
│   │   └── package.json
│   │
│   └── shared/              # 共通型定義 (TypeScript)
│       ├── src/
│       │   ├── types/       # APIスキーマ / DTO
│       │   └── constants/   # 共通定数
│       └── package.json
│
├── infra/                   # Terraform (HCL)
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── terraform.tfvars
│   ├── modules/
│   │   ├── api-gateway/     # HTTP API + ルート
│   │   ├── lambda/          # Lambda関数群
│   │   ├── dynamodb/        # テーブル + GSI
│   │   ├── cognito/         # User Pool + Client
│   │   ├── s3/              # バケット定義
│   │   ├── sns/             # プッシュ通知
│   │   └── monitoring/      # CloudWatch + Budgets
│   ├── backend.tf           # S3 + DynamoDB Lock
│   └── providers.tf
│
├── .github/
│   └── workflows/
│       ├── mobile-build.yml    # Flutterビルド + TestFlight/内部テスト
│       ├── api-deploy.yml      # Lambdaデプロイ
│       └── infra-plan.yml      # tf plan (PR時) / tf apply (mainマージ)
│
├── pnpm-workspace.yaml      # TSワークスペース定義
├── melos.yaml               # Flutterモノレポ管理
├── turbo.json               # Turborepo (TSビルドキャッシュ)
└── .gitignore
```

### 8.2 言語構成

| レイヤー | 言語 | ツール | 場所 |
|---|---|---|---|
| モバイル | Dart | Flutter + Melos | `apps/mobile/` |
| Lambda API | TypeScript | esbuild + pnpm | `packages/api/` |
| 管理画面 | TypeScript | Next.js + Vercel | `apps/admin/` |
| 共通型定義 | TypeScript | pnpm workspace | `packages/shared/` |
| インフラ | HCL | Terraform | `infra/` |
| CI/CD | YAML | GitHub Actions | `.github/workflows/` |

### 8.3 Terraform 設計方針

- `modules/` にリソース単位でモジュール化。再利用性と可読性を確保
- `environments/` で dev / prod を分離。tfvars で環境差分を吸収
- tfstate は S3 + DynamoDB Lock でリモート管理。個人開発でも必須（PC故障時のリスク回避）
- GitHub Actions で PR時に `tf plan` を自動実行、mainマージで `tf apply`
- Secrets (Bedrock APIキー等) は Secrets Manager で管理し、Terraformでプロビジョニング
- 命名規則: `{project}-{env}-{resource}` (例: `workoutplus-prod-api-gw`)

### 8.4 CI/CD パイプライン

| 対象 | トリガー | ツール | 実行内容 |
|---|---|---|---|
| Flutterアプリ | `apps/mobile/**` 変更時 | GitHub Actions + Fastlane | ビルド → TestFlight / 内部テスト |
| Lambda API | `packages/api/**` 変更時 | GitHub Actions + esbuild | esbuild → S3 → Lambda update |
| Terraform | `infra/**` 変更時 | GitHub Actions + TF | PR: plan / main: apply |
| 管理画面 | `apps/admin/**` 変更時 | Vercel (Git統合) | main push → 自動デプロイ |

> path filter を利用し、変更のあったディレクトリのみビルド・デプロイを実行することでCI時間を最小化する。

---

## 9. 開発ロードマップ（個人開発）

1人体制のため、MVPの機能は徹底的に絞り、段階的に拡張する。「使えるものを早く出す」が最優先。

| フェーズ | 期間 | スコープ | 技術タスク | 対応 US |
|---|---|---|---|---|
| Phase 0 設計 | 2週間 | Figmaプロトタイプ・DynamoDB設計・TF初期化・モノレポセットアップ・CI/CD構築 | Figma, TF, GH Actions | - |
| Phase 1 MVP | 6週間 | 記録CRUD・カレンダー・ダッシュボード・ローカル保存・バックアップ・タイマー・種目マスタ | Flutter + drift | US01,02,04,06,09,10,11 |
| Phase 2 サーバー | 4週間 | Cognito認証・DynamoDB同期・RevenueCat課金・プッシュ通知 | TF deploy, Lambda, API GW | US13,14 |
| Phase 3 AI+管理 | 3週間 | AIチャット(v1)・メニュー提案・管理画面(MVP)・詳細分析 | Bedrock, Next.js, Vercel | US16,17,19 |
| Phase 4 リリース | 2週間 | QA・ストア申請・LP作成・リリース | TestFlight, 内部テスト | - |
| Phase 5 運用 | 継続 | ユーザーフィードバック反映・AI強化・新機能追加 | 週次リリースサイクル | - |

**合計: 約15週間（3.5ヶ月）でMVP → 約17週間（4ヶ月強）でフルリリース**

> **戦略:** Phase 1 完了時点でローカルオンリー版をストアに出し、フィードバックを得ながらPhase 2以降を開発するのが最も効率的。

---

## 10. リスクと対策

| リスク | 影響度 | 対策 | 備考 |
|---|---|---|---|
| AI APIコスト爆発 | **高** | Proユーザー月間トークン上限 + Bedrock Budget Alert + レスポンスキャッシュ | AWS Budgetsで$閾値アラート |
| 1人開発の過重負荷 | **高** | MVPスコープ厳守。Phase 1でローカルオンリー版を先行リリース | 完璧を目指さない |
| DynamoDB設計ミス | 中 | アクセスパターンをPhase 0で網羅的に洗い出し。マイグレーションスクリプトで対応可能 | Phase 0で徹底設計 |
| Dart ↔ TSのコンテキストスイッチ | 低 | `packages/shared/` でAPIスキーマを一元管理。OpenAPI定義からDart型を自動生成 (freezed + json_serializable) | 型安全を自動化で担保 |
| ストア審査リジェクト | 中 | Apple/Googleガイドライン準拠チェックリスト。特にIAP関連は厳格に準拠 | サブスク外の課金禁止 |
| バーンアウト | 中 | 週次スプリント制。2週間に1日完全休養。MVPリリース後は週末のみ開発も可 | 持続可能なペース重視 |

---

## 11. まとめ・推奨構成

| 項目 | 内容 |
|---|---|
| プロダクト名 | **Workout+** |
| モバイル | Flutter (Dart) — SkiaレンダリングでUI/UX自由度最高 |
| サーバーサイド | AWS Lambda (TS) + API Gateway + DynamoDB + Cognito + Bedrock |
| IaC | Terraform (HCL) — modules + environments + S3 backend |
| リポジトリ | Gitモノレポ `workout-plus` — Melos (Flutter) + pnpm + Turborepo (TS) |
| 管理画面 | Next.js + Vercel Hobby（無料） |
| 課金 | RevenueCat + Apple/Google IAP |
| CI/CD | GitHub Actions (Flutter + Lambda + TF) + Vercel自動デプロイ |
| 初期コスト | **月額 ~$5**（AWS Free Tier + AI従量課金のみ） |
| 開発期間 | MVP 2ヶ月 / フルリリース 4ヶ月（1人体制） |
| スケーラビリティ | 50K MAUでも月額~$940。サーバーレスのため自動スケール |
| 運用負荷 | サーバー管理ゼロ。CloudWatch + Slack通知で1人運用可能 |
