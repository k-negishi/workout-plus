# Analyze: AI アシスタントチャット — 横断的整合性チェック

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)
**Date**: 2026-02-23

---

## 1. spec.md <-> plan.md 整合性

### 一致している点

| 項目 | 判定 | 備考 |
|------|------|------|
| スコープ定義 | OK | IN/OUT OF SCOPE が完全一致 |
| ディレクトリ構造 | OK | spec の設計要件と plan のツリーが一致 |
| Bedrock モデル | OK | claude-haiku-4-5-20250922-v1:0 で統一 |
| レートリミット仕様 | OK | 1日3回、InMemory、IRateLimitRepository 抽象化 |
| 認証方式 | OK | X-API-Key + 将来 JWT stub |
| 型定義 | OK | ChatRequest/ChatResponse の構造が一致 |
| MockAIService | OK | 動作仕様が一致 |
| テスト戦略 | OK | TDD 必須、カバレッジ 90%+ |

### 差異・要確認事項

| # | 項目 | 内容 | 影響度 | 対応方針 |
|---|------|------|--------|---------|
| A1 | **US05 (AI設定画面) のスコープ** | spec.md の旧版にあった US05（デフォルトプロンプト設定）は更新版の spec.md ではスコープ外に移動済み。plan.md にも AI設定画面（`useAISettings.ts`, `factory.ts`, `AISettings` 型）の痕跡があったが、更新版では削除済み。整合している | 低 | 確認済み。将来フェーズで対応 |
| A2 | **WorkoutHistoryContext の型差異** | spec.md の `WorkoutHistoryContext` は `strategy` + `data[]` 形式。plan.md の `WorkoutHistoryStrategy.buildPromptText()` は `WorkoutHistoryContext` を受け取ってテキスト変換する。mobile 側で構築 -> API に送信 -> API でテキスト変換、の流れは整合 | 低 | 問題なし |
| A3 | **remainingRequests の流れ** | spec.md で `ChatResponse.remainingRequests` を定義。plan.md で `c.set('remainingRequests', remaining)` で rateLimit MW -> ルートハンドラーへ受け渡し。整合 | 低 | 問題なし |

---

## 2. plan.md <-> tasks.md 整合性

### 一致している点

| 項目 | 判定 | 備考 |
|------|------|------|
| タスク数 | OK | 18 タスク（T01-T18） |
| ディレクトリ構造カバレッジ | OK | plan.md の全ファイルがいずれかのタスクでカバー |
| 依存関係 DAG | OK | plan.md の DAG と tasks.md の依存テーブルが一致 |
| テストファイル | OK | 全タスクにテストファイルとテスト内容が明記 |
| 並列実行の機会 | OK | API/Mobile 独立並列が plan.md と tasks.md で一致 |

### 差異・要確認事項

| # | 項目 | 内容 | 影響度 | 対応方針 |
|---|------|------|--------|---------|
| B1 | **T09 の依存範囲** | T09 は T05, T06, T07, T08 に依存。plan.md の DAG では T09 が全ミドルウェア・ストラテジー・サービスの合流点。tasks.md と一致 | 低 | 問題なし |
| B2 | **T11 (ビルド確認) のテスト方法** | tasks.md では「dist/index.js が存在すること」と「@aws-sdk が含まれないこと」を確認と記載。これは手動確認に近い。CI パイプラインとの統合方法は未定義 | 低 | 実装時に npm script として組み込む |
| B3 | **T15 の workoutHistory 取得** | tasks.md で「SQLite から WorkoutHistoryContext を構築（簡易版: TODO で RecentMonthsStrategy 連携を示す）」と記載。plan.md の RecentMonthsStrategy は mobile 側の strategy として定義されているが、tasks.md には mobile 側の Strategy タスクが無い | 中 | **後述「未定義領域」で詳細分析** |

---

## 3. spec.md <-> tasks.md 整合性

### ユーザーストーリーとタスクのマッピング

| ユーザーストーリー | 対応タスク | カバレッジ |
|-------------------|-----------|-----------|
| US01: メッセージ送信 | T15 (useAIChat), T17 (ChatInput), T18 (AIScreen) | OK |
| US02: クイックアクション | T12 (型定義), T17 (QuickActionChips), T18 (AIScreen) | OK |
| US03: AI 回答表示 | T08 (Bedrock), T09 (ルート), T15 (useAIChat), T16 (MessageBubble) | OK |
| US04: 履歴コンテキスト | T06 (Strategy), T15 (useAIChat) | **要注意** (B3参照) |
| US05: 会話履歴表示 | T15 (useAIChat), T16 (MessageBubble), T18 (AIScreen) | OK |
| US06: レートリミット | T05 (rateLimit), T15 (useAIChat), T18 (AIScreen) | OK |
| US07: API 認証 | T04 (apiKey), T10 (app.ts) | OK |
| US08: ウェルカムメッセージ | T15 (useAIChat), T18 (AIScreen) | OK |

### 機能要件とタスクのマッピング

| 機能要件 | 対応タスク | カバレッジ |
|---------|-----------|-----------|
| FR01-FR07 (チャット UI) | T15-T18 | OK |
| FR08-FR09 (履歴コンテキスト) | T06, T15 | **要注意** (B3参照) |
| FR10 (POST /ai/chat) | T09 | OK |
| FR11 (GET /health) | T09 | OK |
| FR12 (X-API-Key) | T04, T10 | OK |
| FR13 (レートリミット) | T05 | OK |
| FR14 (remainingRequests) | T05, T09 | OK |

---

## 4. 未定義領域（Gaps）

### G1: mobile 側の WorkoutHistoryContext 構築ロジック

**問題**: spec.md の FR08 は「SQLite から直近 3 ヶ月のワークアウト履歴を取得しなければならない」と定義。plan.md では mobile 側の `strategies/recentMonths.ts` で SQLite クエリを実行する設計。しかし tasks.md には **mobile 側の WorkoutHistoryStrategy 実装タスクが明示されていない**。T15 (useAIChat) で「簡易版: TODO」と記載するに留まる。

**影響度**: 中

**対応方針**:
- T15 の scope を拡張し、`useAIChat` 内で SQLite から直接クエリする簡易実装を含める
- または追加タスク T15.5「mobile 側 RecentMonthsStrategy 実装」を検討
- 推奨: T15 内で対応（独立した Strategy クラスを mobile 側にも作るのは YAGNI。useAIChat 内の private 関数で十分。将来 Strategy が複数必要になったときに切り出す）

### G2: TypingIndicator コンポーネント

**問題**: spec.md の UI 仕様に TypingIndicator の詳細定義あり（3ドット、bounce アニメーション、8px）。plan.md のディレクトリツリーにも記載。しかし tasks.md には **独立した TypingIndicator タスクが存在しない**。

**影響度**: 低

**対応方針**:
- T18 (AIScreen) の scope に含まれている（「TypingIndicator: isLoading 中に表示」と記載あり）
- TypingIndicator は小規模コンポーネント（10-20行程度）のため、T18 内でインラインまたは別ファイルとして実装で問題なし
- テストも T18 のテストで「ローディング中にタイピングインジケータが表示されること」としてカバー

### G3: deviceId の取得方法

**問題**: spec.md で「deviceId ベースのレートリミット」と定義。tasks.md の T14 (APIAIService) で「expo-application または固定値フォールバック」と記載。しかし `expo-application` が package.json に含まれていない。

**影響度**: 中

**対応方針**:
- `expo-application` は Expo Go にバンドル済みのため、package.json への追加のみで利用可能
- `Application.getIosIdForVendorAsync()` (iOS) / `Application.androidId` (Android) を使用
- フォールバック: ULID ベースのランダム ID を AsyncStorage に保存（初回生成のみ）
- T14 の実装時に対応。タスク内容に明記済み

### G4: KeyboardAvoidingView の扱い

**問題**: T18 で「KeyboardAvoidingView で keyboard 回避」と記載。既存プロジェクトのルールで NativeWind レイアウト系は inline style 必須。KeyboardAvoidingView は Platform 分岐（iOS: padding, Android: height）が必要。

**影響度**: 低

**対応方針**:
- 既存の `.claude/rules/react-navigation-focus.md` のパターンに従う
- `Platform.OS === 'ios' ? 'padding' : 'height'` で分岐
- T18 の実装時に対応

### G5: 残り回数の初期表示

**問題**: spec.md で「残り X/3 回」表示を定義。しかし初回表示時（API 未呼び出し時）の残り回数が不明。MockAIService は固定値 2 を返すが、初期状態はどうするか。

**影響度**: 低

**対応方針**:
- 初期状態: `remainingRequests: null`（非表示）
- 最初の API レスポンス受信後に表示開始
- MockAIService は常に 2 を返す（開発中は常に表示される）

---

## 5. リスク分析

### R1: Bedrock リージョンとモデルアクセス

**リスク**: `anthropic.claude-haiku-4-5-20250922-v1:0` が `us-east-1` で利用可能かどうかの確認が必要。Bedrock のモデルアクセスは AWS コンソールでの有効化が必要。

**影響度**: 高（利用不可なら AI 機能が動作しない）

**対策**:
- AWS コンソールで Bedrock モデルアクセスを事前に有効化
- コード側はモデル ID を環境変数化（`BEDROCK_MODEL_ID`）し、変更可能にする
- テストは全て Bedrock をモックするため、コード実装自体は影響なし

### R2: Lambda コールドスタートによるレートリミットリセット

**リスク**: Lambda のスケーリングや長時間のアイドル後にインメモリ Map がリセットされ、レートリミットが効かなくなる。

**影響度**: 低（Free プランの簡易制限として許容。不正利用者がこれを悪用するリスクは低い）

**対策**:
- 将来の DynamoDB 移行で解決
- 現時点では IRateLimitRepository インターフェースで抽象化しておく

### R3: WorkoutHistoryContext のリクエストサイズ

**リスク**: 3 ヶ月分の履歴が大量にある場合（毎日トレーニング、1回 5 種目 x 5 セット）、リクエストボディが大きくなる可能性。

**試算**:
- 90 ワークアウト x 5 種目 x 5 セット = 2,250 セット
- JSON サイズ: 約 100-150KB（API Gateway のデフォルト上限 10MB 以内）
- Bedrock のトークン上限: 約 4,000 トークン（システムプロンプト分）

**影響度**: 中（トークン制限に引っかかる可能性）

**対策**:
- RecentMonthsStrategy のプロンプトテキスト生成時にトークン数を概算し、上限に近い場合は直近のワークアウトのみに絞る
- max_tokens: 1024 はレスポンス側。入力側のコンテキストウィンドウは 200K なので JSON サイズ自体は問題ない
- **プロンプトテキストの長さ制限**（例: 8,000文字）を RecentMonthsStrategy に組み込む

### R4: Expo Go で expo-application が使えるか

**リスク**: `expo-application` は Expo Go にバンドル済みだが、`getIosIdForVendorAsync()` の挙動確認が必要。

**影響度**: 低

**対策**:
- フォールバック: AsyncStorage に ULID を保存する方式で対応可能
- expo-application が使えない場合は自動的にフォールバックに切り替わる設計にする

### R5: packages/api の pnpm workspace 統合

**リスク**: 既存の turbo.json, pnpm-workspace.yaml との整合性。特に `turbo run test` / `turbo run build` が packages/api を正しく認識するか。

**影響度**: 中

**対策**:
- pnpm-workspace.yaml には既に `packages/*` が含まれているため認識される
- turbo.json は task 定義のみで、package ごとのフィルタは不要
- T01 のセットアップ時に `pnpm install` + `pnpm --filter @workout-plus/api test` で確認

---

## 6. 矛盾点

### C1: 矛盾なし

spec.md / plan.md / tasks.md 間に致命的な矛盾は検出されなかった。

minor な差異（G1-G5）は上記の対応方針で解決可能。

---

## 7. 品質チェックリスト

| # | チェック項目 | 判定 | 備考 |
|---|------------|------|------|
| 1 | 全ユーザーストーリーがタスクにマップされているか | OK | US01-US08 全てカバー |
| 2 | 全機能要件がタスクにマップされているか | OK | FR01-FR14 全てカバー |
| 3 | 非機能要件が実装に反映されているか | OK | NFR01-NFR11 設計に反映 |
| 4 | スコープ外の項目がタスクに混入していないか | OK | AI設定画面等は除外確認済み |
| 5 | テスト戦略が全タスクに含まれているか | OK | 全タスクにテストファイル・内容記載 |
| 6 | 依存関係に循環がないか | OK | DAG として循環なし |
| 7 | クリティカルパスが特定されているか | OK | API/Mobile 両方の CP 明記 |
| 8 | 既存コードベースとの整合性 | OK | DB スキーマ、ナビゲーション構造、NativeWind ルール確認済み |
| 9 | packages/api の workspace 統合 | OK | pnpm-workspace.yaml 確認済み |
| 10 | デザイン規約との整合性 | OK | カラー、角丸、パディング規約準拠 |

---

## 8. 総合評価

**判定: 実装開始可能**

spec / plan / tasks の3文書は十分な整合性を持っており、実装に移行できる状態。
未定義領域（G1-G5）はいずれも低〜中影響度で、各タスクの実装時に対応可能な範囲。
リスク（R1-R5）も適切な対策が定義されている。

**実装開始前の確認事項**:
1. AWS Bedrock コンソールでモデルアクセスを有効化済みか（R1）
2. `pnpm install` 後に `packages/api` が workspace として認識されるか（T01 で確認）

**推奨実行順序**:
1. API 側 T01 と Mobile 側 T12 を同時に開始（5エージェント使用時は API 3 + Mobile 2 の配分）
2. API 側のクリティカルパス: T01 -> T02/T03/T04 -> T05 -> T08 -> T09 -> T10 -> T11
3. Mobile 側のクリティカルパス: T12 -> T13 -> T15 -> T16/T17 -> T18
