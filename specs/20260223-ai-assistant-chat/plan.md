# Implementation Plan: AI アシスタントチャット

**Branch**: `main` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Related Issues**: #8, 新Issue A（AI Lambdalith 基盤 + AI チャット UI）
**Input**: Feature specification from `specs/20260223-ai-assistant-chat/spec.md`

---

## Summary

AI タブのプレースホルダーを完全なチャット UI に置き換え、バックエンドとして Hono + Lambdalith の API パッケージを新設する。
モバイル側は MockAIService で自己完結的に動作し、API デプロイ後に APIAIService に切り替える設計。
packages/api は pnpm workspace の新パッケージとして `@workout-plus/api` を作成する。

**初回リリースは非ストリーミング**（`InvokeModel`）で実装し、将来のストリーミング対応はインターフェースのみ定義する。

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Mobile**: React Native 0.81.5 (Expo SDK 52) / React 19.1.0
**API**: Hono v4 + AWS Lambda (Node.js 20.x, ARM64)
**AI Model**: Bedrock Claude Haiku 4.5 (`anthropic.claude-haiku-4-5-20250922-v1:0`)
**Primary Dependencies**:
  - Mobile: Zustand, NativeWind v4, React Navigation v7, @testing-library/react-native, Jest 29
  - API: hono, @hono/node-server, hono/aws-lambda, @aws-sdk/client-bedrock-runtime, esbuild
**Testing**: Jest 29 (mobile: jest-expo) / Vitest (packages/api: ESM対応・設定ゼロ)
**Target Platform**: iOS 16+ / Android 10+ (Expo Managed Workflow)
**Constraints**: Expo Go 互換必須、Terraform デプロイは新Issue A で別途対応、MockAIService で完全動作可能な状態

---

## 実装アーキテクチャ

### ディレクトリツリー全体

#### packages/api/（新規作成）

```text
packages/api/
├── package.json              # name: "@workout-plus/api"
├── tsconfig.json             # Node.js 20 向け設定
├── vitest.config.ts          # テスト設定（Vitest: ESM対応・ts-jest不要）
├── esbuild.config.ts         # Lambda 用バンドル設定
├── src/
│   ├── index.ts              # Lambda ハンドラー: handle(app)
│   ├── app.ts                # Hono アプリ定義（ルート登録・ミドルウェア適用）
│   ├── routes/
│   │   ├── index.ts          # ルート一括 barrel（app.ts から import）
│   │   ├── health.ts         # GET /health
│   │   └── ai/
│   │       ├── index.ts      # /ai ルートグループ登録
│   │       └── chat.ts       # POST /ai/chat ハンドラーロジック
│   │   # 将来追加: workouts/, auth/, notifications/, sync/
│   ├── middleware/
│   │   ├── apiKey.ts         # X-API-Key 認証（現在）
│   │   ├── jwt.ts            # Cognito JWT 認証（将来 #11）※ stub
│   │   ├── rateLimit.ts      # レートリミット（Hono middleware）
│   │   └── errorHandler.ts   # 共通エラーハンドリング
│   ├── services/
│   │   └── bedrock.ts        # Bedrock Runtime クライアント
│   │   # 将来追加: dynamodb.ts, cognito.ts
│   ├── repositories/
│   │   ├── rateLimit/
│   │   │   ├── interface.ts        # IRateLimitRepository
│   │   │   └── inMemory.ts         # InMemoryRateLimitRepository（現在）
│   │   │   # 将来: dynamodb.ts
│   │   └── conversationHistory/
│   │       ├── interface.ts        # IConversationHistoryRepository
│   │       └── inMemory.ts         # InMemoryConversationHistoryRepository（現在）
│   │       # 将来: dynamodb.ts
│   ├── strategies/
│   │   └── workoutHistory/
│   │       ├── interface.ts        # WorkoutHistoryStrategy
│   │       └── recentMonths.ts     # RecentMonthsStrategy（直近3ヶ月）
│   │       # 将来: exerciseSpecific.ts, dateRange.ts
│   └── types/
│       └── index.ts          # 共通リクエスト/レスポンス型、エラー型
└── __tests__/
    ├── routes/
    │   └── ai/
    │       └── chat.test.ts
    ├── middleware/
    │   ├── apiKey.test.ts
    │   └── rateLimit.test.ts
    └── strategies/
        └── workoutHistory/
            └── recentMonths.test.ts
```

#### apps/mobile/src/features/ai/（新規作成）

```text
apps/mobile/src/features/ai/
├── components/
│   ├── MessageBubble.tsx           # メッセージバブルコンポーネント
│   ├── QuickActionChips.tsx        # クイックアクションチップ
│   ├── ChatInput.tsx               # テキスト入力 + 送信ボタン
│   └── __tests__/
│       ├── MessageBubble.test.tsx
│       ├── QuickActionChips.test.tsx
│       └── ChatInput.test.tsx
├── hooks/
│   ├── useAIChat.ts                # AI チャットフック（メッセージ管理・送信・エラー）
│   └── __tests__/
│       └── useAIChat.test.ts
├── services/
│   ├── index.ts                    # IAIService インターフェース + ファクトリ
│   ├── mock.ts                     # MockAIService（開発用）
│   └── api.ts                      # APIAIService（packages/api 経由・本番）
├── types/
│   └── index.ts                    # ChatMessage, QuickAction, DEFAULT_QUICK_ACTIONS
└── __tests__/
    ├── hooks/
    │   └── useAIChat.test.ts
    └── components/
        ├── MessageBubble.test.tsx
        ├── QuickActionChips.test.tsx
        └── ChatInput.test.tsx

apps/mobile/src/app/screens/
└── AIScreen.tsx                    # 既存プレースホルダーを完全置き換え

apps/mobile/src/app/screens/__tests__/
└── AIScreen.test.tsx               # AIScreen 統合テスト（新規）
```

---

## 主要インターフェース設計

### IAIService（mobile 側）

```typescript
/**
 * AI サービスのインターフェース。
 * MockAIService（開発）と APIAIService（本番）の切り替えポイント。
 *
 * 設計判断: ファクトリ関数で環境変数ベースに切り替える。
 * 理由: サービスの選択はビルド時に決まる（EXPO_PUBLIC_AI_SERVICE_MODE）。
 */
export interface IAIService {
  /** 非ストリーミング チャット */
  chat(params: {
    message: string;
    conversationHistory: ChatMessage[];
    workoutHistory: WorkoutHistoryContext;
  }): Promise<{ content: string; remainingRequests: number }>;
  // 将来: stream(...): AsyncIterable<string>  -- ストリーミング対応時に追加
}
```

### IRateLimitRepository（API 側）

```typescript
/**
 * レートリミットリポジトリインターフェース。
 * 現在は InMemoryRateLimitRepository で Lambda 内メモリに保持。
 * DynamoDB 導入後に DynamoDBRateLimitRepository に差し替え。
 */
export interface IRateLimitRepository {
  /** 利用回数をインクリメントし、制限に達しているか返す */
  increment(deviceId: string): Promise<{ allowed: boolean; remaining: number }>;
  /** 現在の利用状況を取得 */
  getUsage(deviceId: string): Promise<{ count: number; limit: number; date: string }>;
}
```

### IConversationHistoryRepository（API 側 stub）

```typescript
/**
 * 会話履歴の永続化リポジトリインターフェース。
 * 現在は InMemoryConversationHistoryRepository（単純な Map）で stub 実装。
 * DynamoDB 導入後に本格実装する。
 */
export interface IConversationHistoryRepository {
  getHistory(sessionId: string): Promise<ConversationMessage[]>;
  saveMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  clearHistory(sessionId: string): Promise<void>;
}
```

### WorkoutHistoryStrategy（API 側）

```typescript
/**
 * ワークアウト履歴コンテキストをシステムプロンプトのテキストに変換する戦略パターン。
 *
 * 注意: mobile 側が SQLite から取得・構築した WorkoutHistoryContext を受け取り、
 * Lambda 側ではテキスト変換のみを行う。DB アクセスは Lambda 側では行わない。
 */
export interface WorkoutHistoryStrategy {
  /** WorkoutHistoryContext をシステムプロンプト用テキストに変換する */
  buildPromptText(context: WorkoutHistoryContext): string;
}
```

---

## Hono ルーティング設計

### src/app.ts（Hono アプリ定義）

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = new Hono();

// グローバルミドルウェア
app.use('*', cors());
app.onError(errorHandler);

// ルート登録（routes/index.ts から一括）
registerRoutes(app);

export { app };
```

### src/routes/index.ts（ルート一括登録）

```typescript
import type { Hono } from 'hono';
import { healthRoute } from './health';
import { aiRoutes } from './ai';
import { apiKeyMiddleware } from '../middleware/apiKey';

/**
 * 全ルートを app に登録する。
 * 将来エンドポイント追加時は、ここに 1 行追加するだけ。
 */
export function registerRoutes(app: Hono): void {
  // ヘルスチェック（認証不要）
  app.route('/health', healthRoute);

  // AI ルート（X-API-Key 認証必要）
  app.use('/ai/*', apiKeyMiddleware());
  app.route('/ai', aiRoutes);

  // 将来追加:
  // app.route('/workouts', workoutRoutes);
  // app.route('/auth', authRoutes);
}
```

### src/routes/ai/chat.ts

```typescript
import { Hono } from 'hono';
import { rateLimitMiddleware } from '../../middleware/rateLimit';
import type { ChatRequest, ChatResponse } from '../../types';
import { invokeModel } from '../../services/bedrock';
import { RecentMonthsStrategy } from '../../strategies/workoutHistory/recentMonths';

const chat = new Hono();

// レートリミット適用
chat.use(rateLimitMiddleware());

chat.post('/', async (c) => {
  const body = await c.req.json<ChatRequest>();

  // 1. システムプロンプト構築
  const strategy = new RecentMonthsStrategy();
  const historyText = strategy.buildPromptText(body.workoutHistory);
  const systemPrompt = buildSystemPrompt(historyText);

  // 2. Bedrock InvokeModel 呼び出し
  const result = await invokeModel(systemPrompt, body.conversationHistory, body.message);

  // 3. 残り回数取得（rateLimit middleware が c.set() で設定）
  const remaining = c.get('remainingRequests') as number;

  // 4. レスポンス返却
  return c.json<ChatResponse>({
    message: result.text,
    remainingRequests: remaining,
  });
});

export { chat };
```

### src/index.ts（Lambda エントリーポイント）

```typescript
import { handle } from 'hono/aws-lambda';
import { app } from './app';

// Hono アプリを Lambda ハンドラーとしてエクスポート
export const handler = handle(app);
```

---

## レートリミット設計

### InMemoryRateLimitRepository

```typescript
const store = new Map<string, { count: number; date: string }>();

export class InMemoryRateLimitRepository implements IRateLimitRepository {
  private readonly dailyLimit = 3;

  async increment(deviceId: string): Promise<{ allowed: boolean; remaining: number }> {
    const today = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
    const entry = store.get(deviceId);

    if (!entry || entry.date !== today) {
      store.set(deviceId, { count: 1, date: today });
      return { allowed: true, remaining: this.dailyLimit - 1 };
    }

    if (entry.count >= this.dailyLimit) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: this.dailyLimit - entry.count };
  }

  async getUsage(deviceId: string): Promise<{ count: number; limit: number; date: string }> {
    const today = new Date().toISOString().split('T')[0];
    const entry = store.get(deviceId);
    if (!entry || entry.date !== today) {
      return { count: 0, limit: this.dailyLimit, date: today };
    }
    return { count: entry.count, limit: this.dailyLimit, date: entry.date };
  }
}
```

**制約**: Lambda コールドスタート時にカウントがリセットされる。Free プランの簡易制限としては許容範囲。

---

## Mock -> 本番の切り替え方法

### 環境変数ベースのファクトリ

```typescript
// features/ai/services/index.ts
export function createAIService(): IAIService {
  const mode = process.env.EXPO_PUBLIC_AI_SERVICE_MODE ?? 'mock';

  if (mode === 'api') {
    const apiUrl = process.env.EXPO_PUBLIC_AI_API_URL;
    const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error('EXPO_PUBLIC_AI_API_URL と EXPO_PUBLIC_AI_API_KEY が必要です');
    }
    return new APIAIService(apiUrl, apiKey);
  }

  return new MockAIService();
}
```

### MockAIService の動作

```typescript
/**
 * 開発用モック AI サービス。
 * 固定レスポンスを 800ms 遅延で返す（ローディング表示の確認用）。
 * Lambda デプロイ前でもモバイル側の開発・テストが可能。
 */
export class MockAIService implements IAIService {
  async chat(params): Promise<{ content: string; remainingRequests: number }> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const content = this.generateMockResponse(params.message);
    return { content, remainingRequests: 2 };
  }

  private generateMockResponse(message: string): string {
    if (message.includes('振り返')) {
      return '今回のワークアウトお疲れ様でした！ベンチプレスの重量が前回から2.5kg上がっていますね。...';
    }
    if (message.includes('提案') || message.includes('メニュー')) {
      return '履歴を見ると胸と肩が多いですね。今日は背中のトレーニングはいかがでしょう？...';
    }
    return 'トレーニングについてのアドバイスですが、まず目標を明確にすることが大切です。...';
  }
}
```

### APIAIService の動作

```typescript
/**
 * 本番用 AI サービス。API Gateway 経由で Lambda にリクエストを送信する。
 */
export class APIAIService implements IAIService {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  async chat(params): Promise<{ content: string; remainingRequests: number }> {
    const response = await fetch(`${this.apiUrl}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        message: params.message,
        deviceId: await getDeviceId(),
        workoutHistory: params.workoutHistory,
        conversationHistory: params.conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      } satisfies ChatRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AIServiceError(error.code, error.error);
    }

    const data = await response.json() as ChatResponse;
    return { content: data.message, remainingRequests: data.remainingRequests };
  }
}
```

---

## Bedrock 呼び出し設計

```typescript
// services/bedrock.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

/**
 * Bedrock Claude Haiku 4.5 を非ストリーミングで呼び出す。
 *
 * なぜ非ストリーミングか:
 * - MVP として動作するチャットを最優先で完成させるため
 * - Haiku の推論速度なら 3-5 秒で回答が返る
 */
export async function invokeModel(
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string,
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-haiku-4-5-20250922-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));

  return {
    text: body.content[0].text,
    usage: {
      inputTokens: body.usage.input_tokens,
      outputTokens: body.usage.output_tokens,
    },
  };
}
```

---

## esbuild 設定

```typescript
// esbuild.config.ts
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node20',
  format: 'cjs',             // Lambda は CommonJS を推奨
  external: ['@aws-sdk/*'],  // Lambda ランタイムに含まれるため除外
  minify: true,
  sourcemap: true,
});
```

**CommonJS を選択した理由**:
- Lambda ランタイムは ESM をサポートするが、一部の AWS SDK パッケージと ESM の相性に問題がある場合がある
- CJS なら確実に動作し、デバッグも容易
- esbuild でバンドルするため、アプリコードでは ESM import を使いつつ出力は CJS にできる

---

## テスト戦略

### TDD フロー（Red -> Green -> Refactor）

全タスクで以下の順序を厳守する:

1. **Red**: テストを先に書く。テスト実行で失敗（RED）を確認
2. **Green**: テストが通る最小限の実装を書く
3. **Refactor**: コードをリファクタリング（テストは通ったまま）

### API 側テスト

| レイヤー | テスト種別 | ツール | テスト内容 |
|----------|-----------|--------|-----------|
| ルート | Integration | Hono app.request() | POST /ai/chat のリクエスト/レスポンス、GET /health |
| ミドルウェア | Unit | **Vitest** | apiKey 認証、rateLimit の判定ロジック |
| サービス | Unit | **Vitest**（vi.mock） | Bedrock クライアントの呼び出し・レスポンスパース |
| Strategy | Unit | **Vitest** | RecentMonthsStrategy のプロンプトテキスト生成 |
| Repository | Unit | **Vitest** | InMemoryRateLimitRepository のカウント・リセットロジック |

> **Vitest を選択した理由（packages/api）**: AWS SDK v3 は ESM のみ配布。Jest では `transformIgnorePatterns` 設定が煩雑になるが、Vitest はネイティブ ESM 対応でゼロ設定で動く。`vi.mock` は Jest の `jest.mock` と互換 API のため学習コスト不要。

### Mobile 側テスト

| レイヤー | テスト種別 | ツール | テスト内容 |
|----------|-----------|--------|-----------|
| コンポーネント | Unit | @testing-library/react-native | MessageBubble / ChatInput / QuickActionChips の描画 |
| フック | Unit | renderHook | useAIChat のメッセージ管理・送信・エラー処理 |
| サービス | Unit | Jest | MockAIService / APIAIService のインターフェース準拠 |
| 画面 | Integration | @testing-library/react-native | AIScreen 全体の統合テスト |

### カバレッジ目標

- API: 全ファイル 90%+
- Mobile: 変更ファイル 90%+

---

## タスク依存関係 DAG

```
=== packages/api 側 ===

+------------------------------------------+
|  T01: packages/api パッケージセットアップ    |
|  (package.json, tsconfig, esbuild, Vitest)  |
+--------+---------+-----------+-----------+
         |         |           |
         v         v           v
+--------+--+ +----+-------+ ++-----------+
| T02: 共通  | | T03: error | | T04: apiKey|
| 型定義     | | Handler MW | | MW         |
+--------+--+ +----+-------+ ++-----------+
         |         |           |
         |         |           v
         |         |    +------+-----------+
         |         |    | T05: rateLimit   |
         |         |    | (Repo + MW)      |
         |         |    +------+-----------+
         v         |           |
+--------+--+      |           |
| T06: WH   |      |           |
| Strategy   |      |           |
+--------+--+      |           |
         |         |           |
         v         v           v
+--------+---------+-----------+-----------+
| T07: IConvHistory Repo (stub)             |
+--------+----------------------------------+
         |
         v
+--------+----------------------------------+
| T08: Bedrock クライアント                   |
+--------+----------------------------------+
         |
         v
+--------+----------------------------------+
| T09: AI チャットルート統合                   |
| (routes/ai/chat.ts + index.ts)            |
+--------+----------------------------------+
         |
         v
+--------+----------------------------------+
| T10: Hono アプリ + Lambda ハンドラー統合     |
| (app.ts + index.ts)                       |
+--------+----------------------------------+
         |
         v
+--------+----------------------------------+
| T11: esbuild ビルド確認                     |
+-------------------------------------------+


=== apps/mobile 側 ===

+-------------------------------------------+
| T12: AI 型定義 + IAIService IF              |
+--------+----------------------------------+
         |
    +----+----+
    v         v
+---+------+ ++-----------+
| T13: Mock| | T14: API   |
| AIService| | AIService  |
+---+------+ ++-----------+
    |         |
    +----+----+
         v
+--------+----------------------------------+
| T15: useAIChat フック                      |
+--------+----------------------------------+
         |
    +----+--------+--------+
    v             v        v
+---+----------+ ++------+ ++---------+
| T16: Message | | T17:   | | T18:     |
| Bubble       | | Quick  | | AIScreen |
|              | | Action | | 統合     |
|              | | +Chat  | |          |
|              | | Input  | |          |
+--------------+ +--------+ +----------+
```

### 並列実行の機会

1. **API 側と Mobile 側は完全に独立して並列実行可能**
   - API: T01 -> T02/T03/T04 -> T05/T06 -> T07 -> T08 -> T09 -> T10 -> T11
   - Mobile: T12 -> T13/T14 -> T15 -> T16/T17 -> T18

2. **API 内の並列**:
   - T02 (共通型) / T03 (errorHandler) / T04 (apiKey MW) は T01 完了後に並列実行可能
   - T05 (rateLimit) は T04 に依存するが、T06 (Strategy) とは並列可能

3. **Mobile 内の並列**:
   - T13 (MockAIService) / T14 (APIAIService) は T12 完了後に並列実行可能
   - T16 (MessageBubble) / T17 (QuickActionChips + ChatInput) は T15 完了後に並列実行可能
   - T18 (AIScreen) は T16/T17 すべての完了が必要

---

## 非対象事項（スコープ外）

- ストリーミングレスポンス -> インターフェースのみ定義。v2 で実装
- Terraform / CDK / SAM によるインフラ構築 -> 新Issue A のインフラ部分として別途
- Lambda のデプロイ・API Gateway 設定 -> 同上
- DynamoDB チャット履歴永続化 -> 将来フェーズ（IConversationHistoryRepository インターフェースのみ定義）
- Cognito ユーザー認証 -> 将来フェーズ（middleware/jwt.ts に stub のみ配置）
- 有料プラン -> 将来フェーズ（レートリミットを IRateLimitRepository で抽象化）
- AI 設定画面（目標・カスタムプロンプト） -> 将来フェーズ
- 画像・音声入力 -> 将来フェーズ
