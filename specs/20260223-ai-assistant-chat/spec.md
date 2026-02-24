# Feature Specification: AI アシスタントチャット

**Feature Branch**: `main`
**Created**: 2026-02-23
**Status**: Draft
**Related Issues**: #8（AIアシスタント -- チャットUI）, #12（API Gateway + Lambda 基盤）, 新Issue A（AI Lambdalith 基盤 + AIチャットUI）

---

## 概要

ワークアウトアプリに AI チャット機能を追加する。ユーザーは AI タブからトレーニングに関する質問や相談をし、直近のワークアウト履歴をコンテキストとした回答を得られる。

### 目的・価値

| 項目 | 内容 |
|------|------|
| ユーザー価値 | トレーニングメニューの相談、フォームの質問、進捗に基づいたアドバイスを 1 タップで取得 |
| プロダクト価値 | AI 機能によるエンゲージメント向上・他アプリとの差別化 |
| 技術価値 | Hono Lambdalith + API Gateway の基盤構築（将来の CRUD API にも流用可能） |

### スコープ

- **今回実装（新Issue A）**: チャット UI（mobile）+ AI Lambda コード（packages/api）+ Bedrock 呼び出し（非ストリーミング）
- **今回対象外**: ストリーミングレスポンス、DynamoDB 永続化、Cognito 認証、Terraform デプロイ

---

## Issue 分割方針

### 現状の問題

Issue #12（API Gateway + Lambda 基盤）が大きすぎ、依存関係が過剰（#9, #10, #11 すべてに依存）。
AI 機能（#8）を実装するには #12 の全スコープが完了する必要があるが、AI に必要なのはその一部のみ。

### 分割後の構成

```
Before:
  #8 (AI) ─depends on─> #12 (全 API 基盤) ─depends on─> #9, #10, #11

After:
  #8 (AI) ─depends on─> 新Issue A (AI Lambdalith 基盤 + AI チャット UI)
  #12 (更新版: 完全 API 基盤) ─depends on─> #9, #10, #11, 新Issue A
```

### 新 Issue A: "AI Lambdalith 基盤 + AI チャット UI（Issue #8 実装）"

**スコープ**:
- packages/api 全コード実装（Hono lambdalith, ルーティング, ミドルウェア, Bedrock 呼び出し）
- apps/mobile AI チャット UI 全実装（コンポーネント, フック, サービス）
- MockAIService で Lambda デプロイなしに動作確認可能
- depends on なし（Terraform不要・モックで動作）

### Issue #12（更新版）: "完全API基盤 -- Cognito JWT + DynamoDB + 全サービス共通インフラ"

**依存**: #9, #10, #11, 新Issue A（packages/api 基盤）

### Issue #8（依存関係更新）

~~depends on #12~~ -> **depends on 新Issue A**（実装完了後クローズ）

---

## ユーザーストーリー

### US01: チャット UI でメッセージを送信できる

ユーザーが AI タブ画面のテキスト入力にメッセージを入力し、送信ボタンをタップすると、メッセージが画面上にユーザーバブルとして表示される。

**Why**: チャット機能の最も基本的なインタラクション。

**Acceptance Scenarios**:
1. **Given** AI タブ画面を開いている, **When** テキストを入力して送信ボタンをタップ, **Then** ユーザーメッセージがバブルとして右寄せで表示される
2. **Given** テキスト入力が空, **When** 送信ボタンをタップ, **Then** 何も送信されない（ボタンが disabled）
3. **Given** メッセージ送信中, **When** API 通信が完了していない, **Then** 送信ボタンが disabled になり二重送信を防止する

---

### US02: クイックアクション 3 種を 1 タップで送信できる

定型のクイックアクション（「今回を振り返る」「次を提案して」「目標への道筋」）をチップとして表示し、タップすると対応するプロンプトが送信される。

**Why**: 毎回テキストを打つ手間を省き、AI 機能の導入体験をスムーズにする。

**Acceptance Scenarios**:
1. **Given** AI タブ画面を開いている, **When** クイックアクションチップをタップ, **Then** 対応するプロンプトがユーザーメッセージとして送信される
2. **Given** メッセージ送信中, **When** クイックアクションチップをタップ, **Then** 何も起きない（disabled）
3. **Given** 会話履歴が 1 件以上ある, **When** 画面を確認, **Then** クイックアクションチップは引き続き表示される（非表示にしない）

---

### US03: AI からの回答が表示される（非ストリーミング）

ユーザーメッセージ送信後、API を呼び出して Bedrock から回答を取得し、アシスタントバブルとして左寄せで表示する。将来のストリーミング対応に向けたインターフェースをコメントとして残す。

**Why**: チャット機能のコア体験。

**Acceptance Scenarios**:
1. **Given** ユーザーメッセージを送信した, **When** API レスポンスが返る, **Then** アシスタントバブルが左寄せで表示される
2. **Given** API 呼び出し中, **When** レスポンス待ち, **Then** ローディングインジケータ（typing dots）が表示される
3. **Given** API 呼び出しがエラー, **When** レスポンスがエラー, **Then** エラーメッセージがアシスタントバブルとして表示される（「回答を取得できませんでした。もう一度お試しください。」）

---

### US04: 直近のワークアウト履歴が AI コンテキストに含まれる

ユーザーがメッセージを送信する際、mobile 側で SQLite から直近 3 ヶ月のワークアウト履歴を取得し、API リクエストボディに含める。AI はこのコンテキストを踏まえた回答を返す。

**Why**: 汎用的な回答ではなく、ユーザーのトレーニング実績に基づいたパーソナライズされた回答を提供するため。

**Acceptance Scenarios**:
1. **Given** 直近 3 ヶ月のワークアウト履歴がある, **When** メッセージを送信, **Then** API リクエストに履歴データが含まれる
2. **Given** ワークアウト履歴がゼロ, **When** メッセージを送信, **Then** 空の履歴として正常にリクエストが送られる
3. **Given** 直近 3 ヶ月分の履歴が含まれている, **When** AI が回答する, **Then** 回答内容がユーザーの種目・重量・頻度を踏まえている

---

### US05: 会話履歴（セッション内）が表示される

チャット画面にはセッション内の全メッセージが時系列で表示される。アプリを閉じるとリセットされる（永続化は将来対応）。

**Why**: 会話の文脈を維持した自然なチャット体験を提供するため。

**Acceptance Scenarios**:
1. **Given** 複数のメッセージを送信した, **When** 画面を確認, **Then** 全メッセージが時系列で表示されている
2. **Given** 新しいメッセージが追加された, **When** 画面を確認, **Then** 自動スクロールで最新メッセージが見える
3. **Given** チャット画面を離れて戻った（タブ切り替え）, **When** 画面を確認, **Then** セッション内の会話履歴が維持されている（タブ切り替えではアンマウントされないため）
4. **Given** アプリを完全終了して再起動, **When** AI タブを開く, **Then** 会話履歴はリセットされている

---

### US06: Free プランは 1 日 3 回の利用制限がある

無料ユーザーは 1 日 3 回まで AI チャットを利用でき、上限到達時は制限メッセージが表示される。残り回数がレスポンスで返却され、UI に表示される。

**Why**: API コスト制御。将来的に有料プランで上限解除する余地を残す。

**Acceptance Scenarios**:
1. **Given** 今日の利用回数が 2 回, **When** メッセージを送信, **Then** 正常に AI が回答し、残り回数が 0 になる
2. **Given** 今日の利用回数が 3 回（上限）, **When** メッセージを送信, **Then** API が 429 を返し、「本日の利用上限（3回）に達しました。明日またお試しください。」と表示される
3. **Given** 利用上限に達している, **When** 日付が変わる, **Then** カウントがリセットされ再び利用可能になる

---

### US07: API が外部から無許可で叩かれない

API Gateway の全エンドポイントは X-API-Key ヘッダーによる認証が必要。無効なキーや未認証リクエストは拒否される。

**Why**: API の不正利用防止・コスト保護。

**Acceptance Scenarios**:
1. **Given** 正しい X-API-Key を含むリクエスト, **When** API を呼び出す, **Then** 正常にレスポンスが返る
2. **Given** X-API-Key ヘッダーなし, **When** API を呼び出す, **Then** 401 Unauthorized が返る
3. **Given** 不正な X-API-Key, **When** API を呼び出す, **Then** 401 Unauthorized が返る

---

### US08: ウェルカムメッセージが初回表示される

AI タブ画面を開いた初回に、AI アシスタントからのウェルカムメッセージが表示される。

**Why**: 初回のユーザー体験を向上し、何ができるかを案内するため。

**Acceptance Scenarios**:
1. **Given** AI タブを初めて開いた, **When** 画面が表示される, **Then** ウェルカムメッセージ「こんにちは！トレーニングについて何でも聞いてください。」がアシスタントバブルとして表示される

---

## Edge Cases

- **ネットワークオフライン時**: 送信ボタンタップ時にエラーメッセージ「ネットワークに接続してください」を表示。メッセージは入力欄に残す（再送信可能）
- **空メッセージ送信**: 送信ボタンを disabled にし、空文字の送信を防止
- **超長文入力**: 入力文字数の上限を 1000 文字に設定。超過時にカウンター表示
- **API タイムアウト**: 30 秒でタイムアウト。「応答に時間がかかっています。もう一度お試しください。」を表示
- **連続送信防止**: AI がレスポンス中は送信ボタンを disabled にする
- **トレーニング履歴が大量**: システムプロンプトのトークン数制限（約 4000 トークン）。RecentMonthsStrategy で直近 3 ヶ月に絞る

---

## 機能要件

### チャット UI（mobile）

- **FR01**: AI タブ画面にメッセージ入力欄と送信ボタンを表示しなければならない
- **FR02**: ユーザーメッセージを右寄せバブル、アシスタントメッセージを左寄せバブルで表示しなければならない
- **FR03**: クイックアクションチップ（3 種）を画面上部に表示し、タップで定型プロンプトを送信できなければならない
- **FR04**: API 通信中はローディングインジケータ（typing dots）を表示しなければならない
- **FR05**: API エラー時はエラーメッセージをアシスタントバブルとして表示しなければならない
- **FR06**: 会話履歴はセッション内で React State に保持し、最新メッセージに自動スクロールしなければならない
- **FR07**: 初回表示時にウェルカムメッセージを表示しなければならない

### ワークアウト履歴コンテキスト（mobile）

- **FR08**: メッセージ送信時、SQLite から直近 3 ヶ月のワークアウト履歴を取得しなければならない
- **FR09**: 取得した履歴データを API リクエストボディの `workoutHistory` フィールドに含めなければならない

### API（packages/api）

- **FR10**: `POST /ai/chat` エンドポイントがユーザーメッセージ・ワークアウト履歴・会話履歴を受け取り、Bedrock から AI 回答を取得して返却しなければならない
- **FR11**: `GET /health` エンドポイントがヘルスチェックレスポンスを返さなければならない
- **FR12**: X-API-Key 認証ミドルウェアが不正リクエストを 401 で拒否しなければならない
- **FR13**: レートリミットミドルウェアが日次上限超過リクエストを 429 で拒否しなければならない
- **FR14**: レスポンスに `remainingRequests`（今日の残り回数）を含めなければならない

---

## 非機能要件

### パフォーマンス
- **NFR01**: API レスポンスタイム: 10 秒以内（Bedrock の推論時間含む）
- **NFR02**: 履歴データ取得（SQLite クエリ）: 500ms 以内
- **NFR03**: UI 操作（メッセージ送信・スクロール）: 16ms 以内のフレームレート維持

### セキュリティ
- **NFR04**: API は X-API-Key ヘッダーで認証。無効なキーは 401 を返す
- **NFR05**: API Key は AWS Secrets Manager に格納。mobile アプリにはビルド時環境変数で埋め込む
- **NFR06**: API リクエストは HTTPS のみ（API Gateway のデフォルト）

### テスト・品質
- **NFR07**: 変更ファイルのテストカバレッジ 90%+
- **NFR08**: TDD 必須（テストを先に書き RED 確認後に実装）
- **NFR09**: TypeScript strict mode でエラーゼロ

### 可用性
- **NFR10**: Lambda コールドスタート: 3 秒以内（ARM64 + esbuild バンドル最適化）
- **NFR11**: レートリミット超過時は 429 を返し、ユーザーにわかりやすいメッセージを表示

---

## アーキテクチャ概要

### コンポーネント構成図

```
+-----------------------------------------------------------+
|                    Mobile App (Expo)                       |
|                                                           |
|  AIScreen.tsx                                             |
|  +------------------------------------------------------+ |
|  | QuickActionChips                                      | |
|  +------------------------------------------------------+ |
|  | MessageList (FlatList)                                | |
|  |  +---------------------+                              | |
|  |  | MessageBubble       | (user: right, ai: left)      | |
|  |  +---------------------+                              | |
|  |  | TypingIndicator     | (loading 時のみ)             | |
|  |  +---------------------+                              | |
|  +------------------------------------------------------+ |
|  | ChatInput + SendButton                                | |
|  +------------------------------------------------------+ |
|                                                           |
|  hooks/useAIChat.ts                                       |
|    - React State (messages[])                             |
|    - IAIService.chat() 呼び出し                            |
|    - WorkoutHistory 取得（SQLite）                         |
|                                                           |
|  services/                                                |
|    - IAIService (interface)                               |
|    - MockAIService (ローカル開発用)                        |
|    - APIAIService (本番: API 呼び出し)                     |
+-----------------------------------------------------------+
              |
              | HTTPS (POST /ai/chat)
              | X-API-Key header
              v
+-----------------------------------------------------------+
|          API Gateway (HTTP API)                           |
|  /health, /ai/* routes                                    |
+-----------------------------------------------------------+
              |
              v
+-----------------------------------------------------------+
|          Lambda (Hono Lambdalith)                         |
|                                                           |
|  src/app.ts                                               |
|    - errorHandler middleware                               |
|    - X-API-Key middleware (/ai/* のみ)                     |
|    - Rate limit middleware (/ai/chat のみ)                 |
|                                                           |
|  src/routes/ai/chat.ts                                    |
|    - POST /ai/chat                                        |
|    - System prompt 構築                                    |
|    - Bedrock InvokeModel 呼び出し                          |
|                                                           |
|  src/services/bedrock.ts                                  |
|    - BedrockRuntimeClient                                 |
|    - InvokeModelCommand (Claude Haiku 4.5)                |
|                                                           |
|  src/repositories/                                        |
|    - IRateLimitRepository -> InMemory                     |
|    - IConversationHistoryRepository -> InMemory (stub)    |
+-----------------------------------------------------------+
              |
              v
+-----------------------------------------------------------+
|          Amazon Bedrock                                   |
|  anthropic.claude-haiku-4-5-20250922-v1:0                 |
+-----------------------------------------------------------+
```

### データフロー

```
1. ユーザーがメッセージ入力 -> 送信ボタンタップ
2. useAIChat.sendMessage():
   a. ユーザーメッセージを messages[] に追加
   b. SQLite から直近3ヶ月の履歴を WorkoutHistoryContext として取得
   c. IAIService.chat({ message, conversationHistory, workoutHistory }) 呼び出し
3. APIAIService（本番）:
   a. POST /ai/chat に HTTPS リクエスト
   b. X-API-Key ヘッダー付与
   c. deviceId をリクエストボディに含める
4. Lambda (Hono):
   a. X-API-Key 検証 -> 401 or next
   b. Rate limit チェック -> 429 or next
   c. System prompt 構築（ワークアウト履歴をテキスト変換）
   d. Bedrock InvokeModel 呼び出し（非ストリーミング）
   e. JSON レスポンス返却 { message, remainingRequests }
5. mobile:
   a. アシスタントメッセージを messages[] に追加
   b. FlatList が自動スクロール
   c. remainingRequests を表示
```

---

## UI 仕様

### AIScreen レイアウト

```
+------------------------------------------+
| [ヘッダー: AI アシスタント]               |
+------------------------------------------+
| [クイックアクション chips]                |
| [今回を振り返る] [次を提案して] [目標...] |
+------------------------------------------+
|                                          |
|  [AI バブル] こんにちは!                  |
|  トレーニングについて何でも              |
|  聞いてください。                        |
|                                          |
|               [User バブル] 今日の       |
|               メニューを提案して         |
|                                          |
|  [AI バブル] 直近の履歴を見ると...       |
|  ベンチプレスが多いですね。              |
|  今日は背中のメニューを...              |
|                                          |
|  [TypingIndicator ...]  (loading 時)    |
|                                          |
+------------------------------------------+
| 残り 2/3 回                              |
| [ メッセージを入力...        ] [送信]    |
+------------------------------------------+
```

### メッセージバブル

| プロパティ | ユーザーバブル | アシスタントバブル |
|-----------|-------------|-----------------|
| 配置 | 右寄せ | 左寄せ |
| 背景色 | `#4D94FF`（primary） | `#F1F5F9`（neutralBg） |
| テキスト色 | `#FFFFFF` | `#475569`（textPrimary） |
| 角丸 | 12px（左上/左下/右上）, 4px（右下） | 12px（右上/左下/右下）, 4px（左上） |
| 最大幅 | 画面幅の 80% | 画面幅の 80% |
| パディング | 12px 16px | 12px 16px |

### クイックアクションチップ

| プロパティ | 値 |
|-----------|-----|
| レイアウト | 横スクロール（ScrollView horizontal） |
| 背景色 | `#E6F2FF`（primaryBg） |
| テキスト色 | `#4D94FF`（primary） |
| ボーダー | 1px solid `#4D94FF` |
| 角丸 | 20px（pill 形状） |
| パディング | 8px 16px |
| フォントサイズ | 14px |

### クイックアクション定義

| ID | ラベル | プロンプト |
|----|--------|----------|
| `review` | 今回を振り返る | 今回のワークアウトを振り返って、良かった点と改善点を教えてください。 |
| `next` | 次を提案して | 私のトレーニング履歴を踏まえて、次回のメニューを提案してください。 |
| `goal` | 目標への道筋 | 目標達成に向けて、今後のトレーニング計画のアドバイスをください。 |

### ChatInput

| プロパティ | 値 |
|-----------|-----|
| プレースホルダー | 「メッセージを入力...」 |
| 背景色 | `#FFFFFF` |
| ボーダー | 1px solid `#e2e8f0`（border） |
| 角丸 | 24px（pill 形状） |
| 送信ボタン | Ionicons `send` アイコン, `#4D94FF` |
| 送信ボタン disabled | `#CBD5E1`（グレーアウト） |
| 高さ | 自動拡張（最大 4 行） |
| 文字数制限 | 1000 文字 |

### TypingIndicator

| プロパティ | 値 |
|-----------|-----|
| 配置 | アシスタントバブルと同じ左寄せ |
| 表示 | 3 つのドットがアニメーション（bounce） |
| ドット色 | `#64748b`（textSecondary） |
| ドットサイズ | 8px |

---

## データモデル

### packages/api 型定義（packages/api/src/types/index.ts）

```typescript
// POST /ai/chat リクエスト
export type ChatRequest = {
  message: string;
  deviceId: string;                          // レートリミット用（将来Cognito sub に置換）
  workoutHistory: WorkoutHistoryContext;      // mobile側で構築して送信
  conversationHistory: ConversationMessage[]; // セッション内履歴
};

// POST /ai/chat レスポンス
export type ChatResponse = {
  message: string;
  remainingRequests: number;                 // 今日の残り回数
};

// ワークアウト履歴コンテキスト（mobile側が構築）
export type WorkoutHistoryContext = {
  strategy: 'recent_months' | 'exercise_specific' | 'date_range';
  data: WorkoutSummary[];
};

export type WorkoutSummary = {
  date: string;           // 'yyyy-MM-dd'
  exercises: {
    name: string;
    muscleGroup: string;
    sets: { weight: number | null; reps: number | null }[];
  }[];
  memo: string | null;
};

// 会話メッセージ
export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// エラーレスポンス
export type APIError = {
  error: string;
  code: 'UNAUTHORIZED' | 'RATE_LIMIT_EXCEEDED' | 'BEDROCK_ERROR' | 'VALIDATION_ERROR';
};
```

### apps/mobile 型定義（features/ai/types/index.ts）

```typescript
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;        // UNIX ミリ秒
};

export type QuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'review', label: '今回を振り返る', prompt: '今回のワークアウトを振り返って、良かった点と改善点を教えてください。' },
  { id: 'next', label: '次を提案して', prompt: '私のトレーニング履歴を踏まえて、次回のメニューを提案してください。' },
  { id: 'goal', label: '目標への道筋', prompt: '目標達成に向けて、今後のトレーニング計画のアドバイスをください。' },
];

// IAIService インターフェース
export interface IAIService {
  chat(params: {
    message: string;
    conversationHistory: ChatMessage[];
    workoutHistory: WorkoutHistoryContext;
  }): Promise<{ content: string; remainingRequests: number }>;
  // 将来: stream(...): AsyncIterable<string>  -- ストリーミング対応時に追加
}
```

---

## packages/api/ Lambda 仕様

### エンドポイント

| メソッド | パス | 認証 | レートリミット | 説明 |
|---------|------|------|--------------|------|
| GET | `/health` | 不要 | なし | ヘルスチェック |
| POST | `/ai/chat` | X-API-Key | 1日3回/deviceId | AI チャット |

### GET /health

```json
// Response 200
{
  "status": "ok",
  "timestamp": "2026-02-23T10:00:00.000Z"
}
```

### POST /ai/chat

**リクエスト**:
```json
{
  "message": "今日のメニューを提案してください。",
  "deviceId": "device-uuid-abc123",
  "workoutHistory": {
    "strategy": "recent_months",
    "data": [
      {
        "date": "2026-02-22",
        "exercises": [
          {
            "name": "Bench Press",
            "muscleGroup": "chest",
            "sets": [
              { "weight": 80, "reps": 8 },
              { "weight": 80, "reps": 7 }
            ]
          }
        ],
        "memo": null
      }
    ]
  },
  "conversationHistory": [
    { "role": "user", "content": "前回のメッセージ" },
    { "role": "assistant", "content": "前回の回答" }
  ]
}
```

**レスポンス 200**:
```json
{
  "message": "直近の記録を見ると、胸のトレーニングが多いですね。...",
  "remainingRequests": 2
}
```

**レスポンス 401**:
```json
{
  "error": "Unauthorized: Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

**レスポンス 429**:
```json
{
  "error": "本日の利用上限（3回）に達しました。明日またお試しください。",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**レスポンス 500**:
```json
{
  "error": "AI の応答取得に失敗しました。",
  "code": "BEDROCK_ERROR"
}
```

### X-API-Key 認証

```
Header: X-API-Key: <secret>

認証フロー:
1. リクエストヘッダーから X-API-Key を取得
2. 環境変数 API_KEY_SECRET から期待値を取得（本番: Secrets Manager からロード）
3. 一致 -> next()、不一致/欠如 -> 401
```

### レートリミット（1 日 3 回）

```
識別: deviceId（リクエストボディ）
ストレージ: InMemoryRateLimitRepository (Map<string, { count: number; date: string }>)

フロー:
1. deviceId と今日の日付で検索
2. date が今日でなければカウントリセット
3. count >= 3 -> 429
4. count++ して next()
5. remaining = 3 - count をレスポンスに含める

将来: IRateLimitRepository で抽象化し DynamoDB に移行
```

### System Prompt 構築

Lambda 側で以下の順序でシステムプロンプトを組み立てる:

```
1. ベースプロンプト（固定）:
   "あなたはワークアウトアプリのAIアシスタントです。
    ユーザーのトレーニングに関する質問に、専門的かつ親しみやすく回答してください。
    日本語で回答してください。"

2. ワークアウト履歴（workoutHistory.data.length > 0 の場合）:
   "以下はユーザーの直近のワークアウト履歴です:\n{テキスト形式の履歴}"
```

### Bedrock モデル

- モデルID: `anthropic.claude-haiku-4-5-20250922-v1:0`（Claude Haiku 4.5）
- API: `InvokeModel`（非ストリーミング）
- リージョン: `us-east-1`
- max_tokens: 1024

---

## 制約・前提条件

1. **Bedrock モデル**: `anthropic.claude-haiku-4-5-20250922-v1:0`（コスト最適化のため Haiku を採用）
2. **Lambda ランタイム**: Node.js 20.x（ARM64, Graviton2）
3. **API Gateway**: HTTP API（REST API より低コスト）
4. **pnpm workspace**: `packages/api/` を新規ワークスペースとして追加
5. **Expo Go 制約**: mobile 側は純粋な HTTP リクエストのみ。ネイティブモジュール追加なし
6. **認証**: 現時点では X-API-Key のみ（Cognito JWT は #11 実装後に切り替え）
7. **レートリミット**: deviceId ベース（ユーザー認証なし時点では端末単位が最善の選択肢）
8. **Lambda コールドスタート**: esbuild バンドルで依存関係を最小化し、3 秒以内を目標
9. **Node.js 22.x（engines）**: ルートの package.json に合わせる。Lambda は 20.x
10. **会話履歴**: React State（セッション内のみ）。アプリ終了でリセット

---

## スコープ外（今回対象外）

| 項目 | 理由 | 将来の対応方針 |
|------|------|---------------|
| ストリーミングレスポンス | 初回は非ストリーミングで MVP 完成を優先 | `IAIService` にコメントで残す。v2 で実装 |
| DynamoDB チャット履歴永続化 | #10（DynamoDB 基盤）未実装 | `IConversationHistoryRepository` インターフェースのみ定義 |
| Cognito 認証 | #11 未実装 | `middleware/jwt.ts` に stub のみ配置 |
| Terraform デプロイ | 別 Issue | spec には Lambda 仕様のみ記載 |
| 有料プラン・課金 | ビジネスモデル未決定 | レートリミットを `IRateLimitRepository` で抽象化 |
| AI 設定画面（目標/カスタムプロンプト） | スコープ絞り込み | 将来フェーズ。インターフェースのみ考慮 |
| 多言語対応 | 日本語ユーザーのみが対象 | システムプロンプトで「日本語で回答」を指定 |
| 音声入力 / 画像入力 | UI の複雑化を避ける | 将来フェーズで検討 |

---

## 重要な設計判断

### 1. モノリシック Lambda（Lambdalith）+ Hono

**判断**: 全エンドポイントを単一 Lambda に集約し、Hono でルーティングする。

**候補と比較**:

| 方式 | メリット | デメリット | 推奨度 |
|------|---------|-----------|--------|
| Lambdalith + Hono | デプロイ単純・コールドスタート1回・ルート追加が容易 | 関数サイズ肥大のリスク（数十エンドポイントまで問題なし） | **推奨** |
| 個別 Lambda (1 endpoint = 1 function) | 粒度が細かくスケール独立 | デプロイ管理が煩雑・個人開発には過剰 | 非推奨 |
| Express on Lambda | 慣れた人が多い | バンドルサイズ大・Hono より遅い | 非推奨 |

**根拠**: 個人開発プロジェクトで将来エンドポイントが 10-20 個に増えても、Lambdalith + Hono なら管理コストが最小。

### 2. 非ストリーミング（初回）+ 将来拡張設計

**判断**: 初回リリースは非ストリーミング（`InvokeModel`）で実装する。

**根拠**:
- MVP としてまず「動く AI チャット」を完成させることが最優先
- ストリーミングは API Gateway + Lambda の設定が複雑化する（Response Streaming, Lambda URL が必要）
- 非ストリーミングでも Haiku の推論速度であれば 3-5 秒で回答が返る

**将来拡張**:
- `IAIService` に `stream()` メソッドをコメントで残す
- Lambda を Function URL に切り替え、`InvokeModelWithResponseStream` + SSE で実装

### 3. インメモリレートリミット

**判断**: Lambda のインメモリ Map で実装する。

**根拠**:
- DynamoDB（#10）が未実装のため永続ストレージが使えない
- Lambda のインメモリは同一インスタンスが再利用される限り有効
- コールドスタート時にリセットされるが、Free プランの簡易制限としては十分
- `IRateLimitRepository` インターフェースで抽象化し、DynamoDB 移行時はインターフェース差し替えのみ

### 4. 履歴コンテキストの構築場所: mobile 側

**判断**: mobile 側で SQLite から履歴を取得し、`WorkoutHistoryContext` を構築して API に送信する。

**候補と比較**:

| 方式 | メリット | デメリット | 推奨度 |
|------|---------|-----------|--------|
| mobile 側で構築 | SQLite に直接アクセス可能・Lambda に DB 接続不要 | リクエストサイズが大きくなる | **推奨** |
| Lambda 側で DB アクセス | リクエストが軽い | DynamoDB/RDS が必要・DB 同期問題 | 非推奨（現時点） |

**根拠**: 現在のアーキテクチャでは SQLite はローカル端末にしか存在しない。Lambda が履歴を取得するにはクラウド DB が必要だが、それは将来の同期基盤実装後の話。

### 5. 会話履歴: React State（セッション内のみ）

**判断**: 会話履歴は React State で保持し、アプリ終了でリセットする。

**根拠**:
- DynamoDB が未実装で永続化先がない
- タブナビゲーションではタブ切り替えでアンマウントされないため、タブ切り替え中は維持される
- `IConversationHistoryRepository` インターフェースのみ定義し、DynamoDB 導入後に差し替え

---

## GitHub Issue 更新方針

### 新規作成する Issue

**タイトル**: "AI Lambdalith 基盤 + AI チャット UI（Issue #8 実装）"

**内容**:
- packages/api Hono lambdalith 全コード実装
- AI チャット UI (apps/mobile) 全コンポーネント・フック・サービス
- MockAIService で動作確認可能な状態
- depends on なし（Terraform不要・モックで動作）

### Issue #12 更新

**タイトル（更新）**: "完全API基盤 -- Cognito JWT + DynamoDB + 全サービス共通インフラ（packages/api 基盤は別Issue済み）"
- depends on #9, #10, #11, 新Issue A

### Issue #8 更新

- ~~depends on #12~~ -> depends on 新Issue A（実装完了後クローズ）
