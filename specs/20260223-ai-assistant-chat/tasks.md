# Tasks: AI アシスタントチャット

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-02-23

---

## タスク一覧

### T01: packages/api パッケージセットアップ
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（Mobile 側と並列）
- **依存**: なし
- **担当層**: api
- **内容**:
  - `packages/api/package.json` 作成（name: `@workout-plus/api`, engines: node >=20）
    - dependencies: `hono`, `@aws-sdk/client-bedrock-runtime`
    - devDependencies: `@types/node`, `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`
    - scripts: `build`, `test`, `test:coverage`, `lint`
    - **テストフレームワーク: Vitest**（Jest ではなく Vitest を選択）
      - 理由: AWS SDK v3 が ESM のみ配布 → Jest の transformIgnorePatterns 設定が不要
      - 理由: Node.js Lambda パッケージに RN 固有の Jest Expo preset は不要
      - 理由: TypeScript をゼロ設定で実行可能（ts-jest 不要）
  - `packages/api/tsconfig.json` 作成（target: ES2022, module: Node16, strict: true）
  - `packages/api/vitest.config.ts` 作成（environment: 'node', coverage: v8）
  - `packages/api/esbuild.config.ts` 作成（entryPoint: src/index.ts, outfile: dist/index.js, platform: node, target: node20, format: cjs, external: @aws-sdk/*, minify: true, sourcemap: true）
  - `pnpm install` で workspace 認識確認
- **テスト**: `pnpm --filter @workout-plus/api test` が正常終了すること、`pnpm --filter @workout-plus/api build` で dist/index.js が生成されること（スモークテスト）

---

### T02: 共通型定義（packages/api）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（T03, T04 と並列）
- **依存**: T01
- **担当層**: api
- **内容**:
  - `packages/api/src/types/index.ts` 作成
    - `ChatRequest`: message, deviceId, workoutHistory, conversationHistory
    - `ChatResponse`: message, remainingRequests
    - `WorkoutHistoryContext`: strategy, data(WorkoutSummary[])
    - `WorkoutSummary`: date, exercises[], memo
    - `ConversationMessage`: role, content
    - `APIError`: error, code
- **テスト**: 型定義ファイルのため直接テスト不要。`tsc --noEmit` でコンパイルエラーなしを確認
  - `packages/api/__tests__/types/index.test.ts`: 型の shape テスト（satisfies によるコンパイルチェック）

---

### T03: エラーハンドラーミドルウェア
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（T02, T04 と並列）
- **依存**: T01
- **担当層**: api
- **内容**:
  - `packages/api/src/middleware/errorHandler.ts` 作成
    - Hono の `app.onError` ハンドラーとして登録
    - 既知エラー（APIError 型）はそのまま返却
    - 未知エラーは 500 + `{ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }` を返却
    - エラーログ出力（console.error）
- **テスト**: `packages/api/__tests__/middleware/errorHandler.test.ts`（TDD: テスト先行）
  - 既知エラーが正しいステータスコード・ボディで返ること
  - 未知エラーが 500 で返ること
  - エラーログが出力されること

---

### T04: X-API-Key 認証ミドルウェア
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（T02, T03 と並列）
- **依存**: T01
- **担当層**: api
- **内容**:
  - `packages/api/src/middleware/apiKey.ts` 作成
    - `apiKeyMiddleware()` ファクトリ関数
    - リクエストヘッダー `X-API-Key` を検証
    - 環境変数 `API_KEY_SECRET` から期待値を取得
    - 一致 -> `next()`、不一致/欠如 -> 401 `{ error: 'Unauthorized: Invalid or missing API key', code: 'UNAUTHORIZED' }`
- **テスト**: `packages/api/__tests__/middleware/apiKey.test.ts`（TDD: テスト先行）
  - 正しい API Key で 200 が返ること
  - API Key なしで 401 が返ること
  - 不正な API Key で 401 が返ること
  - 環境変数未設定時のフォールバック動作

---

### T05: レートリミット（IRateLimitRepository + InMemory実装 + Hono middleware）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（T06 と並列）
- **依存**: T04
- **担当層**: api
- **内容**:
  - `packages/api/src/repositories/rateLimit/interface.ts` 作成
    - `IRateLimitRepository` インターフェース: `increment(deviceId)`, `getUsage(deviceId)`
  - `packages/api/src/repositories/rateLimit/inMemory.ts` 作成
    - `InMemoryRateLimitRepository` 実装
    - `Map<string, { count: number; date: string }>` でインメモリ管理
    - 日付変更でカウントリセット
    - dailyLimit = 3
  - `packages/api/src/middleware/rateLimit.ts` 作成
    - `rateLimitMiddleware()` ファクトリ関数
    - リクエストボディから deviceId を取得
    - `IRateLimitRepository.increment()` でチェック
    - 上限超過 -> 429 `{ error: '本日の利用上限（3回）に達しました。...', code: 'RATE_LIMIT_EXCEEDED' }`
    - 許可 -> `c.set('remainingRequests', remaining)` して `next()`
- **テスト**: `packages/api/__tests__/middleware/rateLimit.test.ts`（TDD: テスト先行）
  - 初回リクエストで allowed: true, remaining: 2
  - 3回目で allowed: true, remaining: 0
  - 4回目で allowed: false, remaining: 0
  - 日付変更でカウントリセット
  - 429 レスポンスが正しい形式であること

---

### T06: WorkoutHistoryStrategy（interface + RecentMonthsStrategy）
- **ステータス**: [ ] 未着手
- **優先度**: 中
- **並列可否**: 可（T05 と並列）
- **依存**: T02
- **担当層**: api
- **内容**:
  - `packages/api/src/strategies/workoutHistory/interface.ts` 作成
    - `WorkoutHistoryStrategy` インターフェース: `buildPromptText(context: WorkoutHistoryContext): string`
  - `packages/api/src/strategies/workoutHistory/recentMonths.ts` 作成
    - `RecentMonthsStrategy` 実装
    - `WorkoutHistoryContext.data` をテキスト形式に変換
    - 各ワークアウトの日付・種目・セット情報をマークダウン風に整形
    - 履歴なしの場合は空文字を返す
- **テスト**: `packages/api/__tests__/strategies/workoutHistory/recentMonths.test.ts`（TDD: テスト先行）
  - 履歴あり: 正しいテキスト形式に変換されること
  - 履歴なし（data: []）: 空文字が返ること
  - 複数ワークアウト: 日付順に整形されること
  - 種目の重量・レップが null のケース

---

### T07: IConversationHistoryRepository + InMemory実装（stub）
- **ステータス**: [ ] 未着手
- **優先度**: 低
- **並列可否**: 可（T06 完了後）
- **依存**: T02
- **担当層**: api
- **内容**:
  - `packages/api/src/repositories/conversationHistory/interface.ts` 作成
    - `IConversationHistoryRepository` インターフェース: `getHistory`, `saveMessage`, `clearHistory`
  - `packages/api/src/repositories/conversationHistory/inMemory.ts` 作成
    - `InMemoryConversationHistoryRepository` 実装（`Map<string, ConversationMessage[]>`）
    - 将来 DynamoDB に差し替え予定のため stub 実装
- **テスト**: 軽量な単体テスト
  - `saveMessage` -> `getHistory` で保存・取得できること
  - `clearHistory` でクリアされること

---

### T08: Bedrock クライアント
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 不可
- **依存**: T02
- **担当層**: api
- **内容**:
  - `packages/api/src/services/bedrock.ts` 作成
    - `invokeModel(systemPrompt, conversationHistory, userMessage)` 関数
    - `BedrockRuntimeClient` + `InvokeModelCommand` で Claude Haiku 4.5 を呼び出し
    - モデルID: `anthropic.claude-haiku-4-5-20250922-v1:0`
    - `anthropic_version: 'bedrock-2023-05-31'`, `max_tokens: 1024`
    - レスポンスから text と usage を抽出
    - エラー時は `BEDROCK_ERROR` コードのエラーを throw
  - システムプロンプト構築関数 `buildSystemPrompt(historyText: string): string`
    - ベースプロンプト + 履歴テキスト
- **テスト**: `packages/api/__tests__/services/bedrock.test.ts`（TDD: テスト先行）
  - `@aws-sdk/client-bedrock-runtime` をモック
  - 正常レスポンスから text, usage が正しく抽出されること
  - Bedrock エラー時に適切なエラーが throw されること
  - `buildSystemPrompt` が正しいテキストを生成すること

---

### T09: AI チャットルート（routes/ai/chat.ts + routes/ai/index.ts）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 不可
- **依存**: T05, T06, T07, T08
- **担当層**: api
- **内容**:
  - `packages/api/src/routes/ai/chat.ts` 作成
    - POST `/` ハンドラー
    - リクエストボディのバリデーション（message, deviceId 必須）
    - WorkoutHistoryStrategy でプロンプトテキスト生成
    - buildSystemPrompt でシステムプロンプト構築
    - invokeModel で Bedrock 呼び出し
    - `c.get('remainingRequests')` でレートリミット残回数取得
    - `ChatResponse` 形式でレスポンス返却
  - `packages/api/src/routes/ai/index.ts` 作成
    - chat ルートをまとめてエクスポート
  - `packages/api/src/routes/health.ts` 作成
    - GET `/` -> `{ status: 'ok', timestamp: ... }`
  - `packages/api/src/routes/index.ts` 作成
    - `registerRoutes(app)` で全ルート一括登録
- **テスト**: `packages/api/__tests__/routes/ai/chat.test.ts`（TDD: テスト先行）
  - Bedrock モックで正常レスポンスが返ること
  - リクエストバリデーション（message 欠落で 400）
  - remainingRequests がレスポンスに含まれること
  - health エンドポイントのテスト

---

### T10: Hono アプリ + Lambda ハンドラー統合（app.ts + index.ts）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 不可
- **依存**: T09
- **担当層**: api
- **内容**:
  - `packages/api/src/app.ts` 作成
    - Hono インスタンス作成
    - CORS ミドルウェア適用
    - errorHandler 登録（`app.onError`）
    - `registerRoutes(app)` で全ルート登録
    - `/ai/*` に apiKeyMiddleware 適用
  - `packages/api/src/index.ts` 作成
    - `import { handle } from 'hono/aws-lambda'`
    - `export const handler = handle(app)`
  - `packages/api/src/middleware/jwt.ts` 作成（stub）
    - `// TODO: Cognito JWT 認証。#11 実装後に有効化`
    - `export const jwtMiddleware = () => async (c, next) => await next();`
- **テスト**: Hono app 全体の統合テスト
  - GET /health が 200 を返すこと
  - POST /ai/chat が X-API-Key なしで 401 を返すこと
  - POST /ai/chat が正しい認証で 200 を返すこと（Bedrock モック）
  - CORS ヘッダーが含まれること

---

### T11: esbuild ビルド確認
- **ステータス**: [ ] 未着手
- **優先度**: 中
- **並列可否**: 不可
- **依存**: T10
- **担当層**: api
- **内容**:
  - `pnpm --filter @workout-plus/api build` 実行
  - `dist/index.js` が生成されること
  - `dist/index.js.map` が生成されること
  - `@aws-sdk/*` が外部化（バンドルに含まれない）されていること
  - ファイルサイズの確認（目標: 500KB 以下）
- **テスト**: ビルド成功の確認（CI 的な検証）
  - `dist/index.js` が存在すること
  - `dist/index.js` 内に `@aws-sdk` が含まれないこと（external 確認）

---

### T12: AI 型定義 + IAIService インターフェース（mobile）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（API 側と並列）
- **依存**: なし
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/types/index.ts` 作成
    - `ChatMessage`: id, role, content, createdAt
    - `QuickAction`: id, label, prompt
    - `DEFAULT_QUICK_ACTIONS`: 3 種（review, next, goal）
    - `WorkoutHistoryContext` 型（packages/api と共通構造）
    - `WorkoutSummary` 型
  - `apps/mobile/src/features/ai/services/index.ts` 作成
    - `IAIService` インターフェース定義
    - `createAIService()` ファクトリ関数（環境変数ベース切り替え）
    - ストリーミング対応のコメント残し
- **テスト**: 型定義のコンパイルチェック。`tsc --noEmit` でエラーなし

---

### T13: MockAIService 実装
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 可（T14 と並列）
- **依存**: T12
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/services/mock.ts` 作成
    - `MockAIService` クラス（`IAIService` 実装）
    - 800ms 遅延後に固定レスポンスを返す
    - メッセージ内容に応じた分岐（振り返り系、提案系、デフォルト）
    - `remainingRequests` は固定値 2 を返す
- **テスト**: `apps/mobile/src/features/ai/__tests__/services/mock.test.ts`（TDD: テスト先行）
  - `chat()` が `IAIService` の型に準拠したレスポンスを返すこと
  - 遅延が含まれること（タイミングテスト）
  - メッセージに応じたレスポンス分岐

---

### T14: APIAIService 実装
- **ステータス**: [ ] 未着手
- **優先度**: 中
- **並列可否**: 可（T13 と並列）
- **依存**: T12
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/services/api.ts` 作成
    - `APIAIService` クラス（`IAIService` 実装）
    - `fetch` で `POST /ai/chat` 呼び出し
    - X-API-Key ヘッダー付与
    - deviceId 取得（expo-application または固定値フォールバック）
    - エラーハンドリング（401, 429, 500 それぞれのエラーメッセージ）
    - タイムアウト設定（30 秒）
- **テスト**: `apps/mobile/src/features/ai/__tests__/services/api.test.ts`（TDD: テスト先行）
  - `global.fetch` をモック
  - 正常レスポンスで content, remainingRequests が返ること
  - 401 で適切なエラーが throw されること
  - 429 で「利用上限」エラーが throw されること
  - ネットワークエラーのハンドリング

---

### T15: useAIChat フック
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 不可
- **依存**: T13（MockAIService が必要）
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/hooks/useAIChat.ts` 作成
    - State: `messages: ChatMessage[]`, `isLoading: boolean`, `remainingRequests: number | null`
    - `sendMessage(text: string)`: ユーザーメッセージ追加 -> IAIService.chat() -> アシスタントメッセージ追加
    - `sendQuickAction(action: QuickAction)`: クイックアクションのプロンプトで sendMessage
    - エラーハンドリング: エラーメッセージをアシスタントバブルとして追加
    - ウェルカムメッセージ: 初期 messages にアシスタントの挨拶を含める
    - ワークアウト履歴取得: SQLite から `WorkoutHistoryContext` を構築（簡易版: TODO で RecentMonthsStrategy 連携を示す）
    - 二重送信防止: isLoading 中は sendMessage を no-op
- **テスト**: `apps/mobile/src/features/ai/__tests__/hooks/useAIChat.test.ts`（TDD: テスト先行）
  - renderHook + act で状態変化を検証
  - 初期状態でウェルカムメッセージがあること
  - sendMessage でユーザー・アシスタントメッセージが追加されること
  - isLoading が送信中に true -> 完了後に false
  - エラー時にエラーメッセージがアシスタントバブルとして追加されること
  - 空文字の sendMessage が no-op であること
  - isLoading 中の sendMessage が no-op であること

---

### T16: MessageBubble コンポーネント
- **ステータス**: [ ] 未着手
- **優先度**: 中
- **並列可否**: 可（T17 と並列）
- **依存**: T15（型定義が必要）
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/components/MessageBubble.tsx` 作成
    - Props: `message: ChatMessage`
    - ユーザーメッセージ: 右寄せ、背景 #4D94FF、テキスト白
    - アシスタントメッセージ: 左寄せ、背景 #F1F5F9、テキスト #475569
    - 角丸: ユーザー（左上/左下/右上 12px, 右下 4px）、アシスタント（右上/左下/右下 12px, 左上 4px）
    - 最大幅: 画面幅の 80%
    - パディング: 12px 16px
    - NativeWind ルールに従い、レイアウト系は inline style
- **テスト**: `apps/mobile/src/features/ai/__tests__/components/MessageBubble.test.tsx`（TDD: テスト先行）
  - ユーザーメッセージが正しく描画されること（テキスト表示）
  - アシスタントメッセージが正しく描画されること
  - ユーザーとアシスタントでスタイルが異なること

---

### T17: QuickActionChips + ChatInput コンポーネント
- **ステータス**: [ ] 未着手
- **優先度**: 中
- **並列可否**: 可（T16 と並列）
- **依存**: T15（型定義が必要）
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/features/ai/components/QuickActionChips.tsx` 作成
    - Props: `actions: QuickAction[]`, `onPress: (action: QuickAction) => void`, `disabled: boolean`
    - 横スクロール ScrollView
    - pill 形状チップ（角丸 20px、背景 #E6F2FF、テキスト #4D94FF、ボーダー #4D94FF）
    - disabled 時のグレーアウト
  - `apps/mobile/src/features/ai/components/ChatInput.tsx` 作成
    - Props: `onSend: (text: string) => void`, `disabled: boolean`
    - TextInput + 送信ボタン（Ionicons `send`）
    - pill 形状（角丸 24px）
    - 空文字時は送信ボタン disabled
    - 文字数制限 1000 文字
    - 自動拡張（最大 4 行）
    - 送信後にテキストクリア
- **テスト**:
  - `apps/mobile/src/features/ai/__tests__/components/QuickActionChips.test.tsx`（TDD）
    - チップが3つ表示されること
    - タップで onPress が呼ばれること
    - disabled 時にタップしても onPress が呼ばれないこと
  - `apps/mobile/src/features/ai/__tests__/components/ChatInput.test.tsx`（TDD）
    - テキスト入力と送信が動作すること
    - 空文字で送信ボタンが disabled であること
    - 送信後にテキストがクリアされること
    - disabled prop で入力が無効になること

---

### T18: AIScreen 完全実装（全コンポーネント統合）
- **ステータス**: [ ] 未着手
- **優先度**: 高
- **並列可否**: 不可
- **依存**: T15, T16, T17
- **担当層**: mobile
- **内容**:
  - `apps/mobile/src/app/screens/AIScreen.tsx` 完全書き換え
    - ヘッダー: 「AI アシスタント」タイトル
    - QuickActionChips: 画面上部
    - FlatList: メッセージリスト（inverted: false, 最新メッセージに自動スクロール）
    - TypingIndicator: isLoading 中に表示（3ドットアニメーション）
    - ChatInput: 画面下部（KeyboardAvoidingView で keyboard 回避）
    - 残り回数表示: ChatInput の上に「残り X/3 回」テキスト
    - useSafeAreaInsets でセーフエリア対応
    - useAIChat フックで状態管理
    - MockAIService で完全動作する状態
- **テスト**: `apps/mobile/src/app/screens/__tests__/AIScreen.test.tsx`（TDD: テスト先行）
  - 画面が正常にレンダリングされること
  - ウェルカムメッセージが表示されること
  - クイックアクションチップが表示されること
  - メッセージ入力・送信フローの統合テスト（MockAIService モック）
  - ローディング中にタイピングインジケータが表示されること

---

## タスク依存関係サマリー

| タスク | 依存先 | 並列可能な組み合わせ |
|--------|--------|---------------------|
| T01 | なし | T12 と並列 |
| T02 | T01 | T03, T04 と並列 |
| T03 | T01 | T02, T04 と並列 |
| T04 | T01 | T02, T03 と並列 |
| T05 | T04 | T06 と並列 |
| T06 | T02 | T05 と並列 |
| T07 | T02 | T06 完了後 |
| T08 | T02 | T07 完了後 |
| T09 | T05, T06, T07, T08 | - |
| T10 | T09 | - |
| T11 | T10 | - |
| T12 | なし | T01 と並列 |
| T13 | T12 | T14 と並列 |
| T14 | T12 | T13 と並列 |
| T15 | T13 | - |
| T16 | T15 | T17 と並列 |
| T17 | T15 | T16 と並列 |
| T18 | T15, T16, T17 | - |

## クリティカルパス

```
API側:  T01 -> T04 -> T05 -> T09 -> T10 -> T11
Mobile側: T12 -> T13 -> T15 -> T18
```

API 側と Mobile 側は完全に独立しているため、最大 2 レーンで並列実行可能。
Mobile 側は MockAIService を使用するため、API 側の完了を待つ必要がない。

## 推定工数

| 区分 | タスク数 | 推定合計時間 |
|------|---------|-------------|
| packages/api | T01-T11（11タスク） | 8-10 時間 |
| apps/mobile | T12-T18（7タスク） | 6-8 時間 |
| **合計** | **18タスク** | **14-18 時間** |

並列実行（5エージェント）の場合、クリティカルパスに基づき **4-6 時間** で完了見込み。
