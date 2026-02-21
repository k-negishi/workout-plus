# Research: ワークアウト記録コア画面

**Feature**: `001-workout-core-screens`
**Date**: 2026-02-21
**Status**: Complete — 全ての「要確認」が解決済み

## 技術選定

### 1. ローカルDB: expo-sqlite

**決定**: expo-sqlite (expo-sqlite/next, SDK 52+)

**根拠**:
- Expo managed workflow にネイティブ統合。追加ネイティブモジュール不要で Expo Go 対応
- WatermelonDB は Development Build 必須 → managed workflow から逸脱し、コンスティテューション原則V（個人開発の持続可能性）に反するリスク
- MVPはローカル完結。WatermelonDBの最大の強み（リアクティブ、Sync Engine）はMVPでは不要
- リアクティブクエリの欠如は Zustand の invalidation pattern で補完可能
- 将来 WatermelonDB/PowerSync への移行時も Repository 層の差し替えで対応可能

**検討した代替案**:

| 候補 | 評価 | 不採用理由 |
|------|------|-----------|
| WatermelonDB | リアクティブ・Sync Engineが強力 | Development Build必須。Expo managed workflowから逸脱。学習コスト高 |
| Realm (MongoDB) | リアクティブ対応 | Expo managed非対応。SDK 52以降のサポート不安定 |
| @op-engineering/op-sqlite | 高速（JSI） | 新しいライブラリで安定性未検証。Expo Go非対応 |

### 2. 状態管理: Zustand

**決定**: Zustand 5

**根拠**:
- コンポーネント外からの状態操作（`getState()` / `setState()`）が自然 → タイマーの `setInterval` や `AppState` イベントからストアを直接更新可能
- ボイラープレート極少（1ファイルにストア定義可能）。9画面・5エンティティに対して適切な複雑さ
- セレクターによる部分購読で不要な再レンダリングを自然に回避
- バンドルサイズ ~1KB (gzip)

**検討した代替案**:

| 候補 | 評価 | 不採用理由 |
|------|------|-----------|
| Redux Toolkit | エコシステム最大。型安全 | 9画面・5エンティティに対してオーバーエンジニアリング。ボイラープレート増 |
| Jotai | アトミック状態管理。軽量 | Workout→Exercise→Setの階層状態をアトム間derivedで管理すると複雑化 |
| React Context + useReducer | 追加依存なし | コンポーネント外からdispatch不可。タイマー管理が不自然。Context全体の再レンダリング |

**ストア設計（3分割）**:
1. `workoutSessionStore` — 記録中のワークアウト状態（タイマー含む）
2. `exerciseStore` — 種目マスタ・お気に入り・カスタム種目
3. `uiStore` — モーダル表示状態等

### 3. ナビゲーション: React Navigation 7

**決定**: React Navigation 7 (明示的ナビゲーター定義)

**根拠**:
- 複雑なモーダル構造（RecordStack as fullScreenModal, DiscardDialog as transparentModal）を明示的に制御可能
- Tab内Stack + Root直下Modal の3層構造が型安全に定義できる
- React Native エコシステムで最も成熟。ドキュメント・事例が豊富

**検討した代替案**:

| 候補 | 評価 | 不採用理由 |
|------|------|-----------|
| Expo Router | Expo公式推奨。ファイルベース | モーダル3層構造の明示的制御に不向き。動的ルートの複雑さが増す |

### 4. プロジェクト構造: feature-based

**決定**: feature-based 構成（テスト colocation）

**根拠**:
- 関連ファイル（Screen, Component, Hook, test）が1フォルダに集約 → 認知負荷が低い
- 新機能追加は `features/` に新ディレクトリ追加するだけ。既存に影響なし
- テストファイルを同一ディレクトリに配置 → 変更時にテストの存在に気づきやすい

**検討した代替案**:

| 候補 | 評価 | 不採用理由 |
|------|------|-----------|
| layer-based (screens/, components/, hooks/) | 馴染みのある構造 | Workout関連ファイルが3ディレクトリに分散。9画面では管理しやすいが将来の拡張で肥大化 |

### 5. ID生成: ULID

**決定**: ULID (Universally Unique Lexicographically Sortable Identifier)

**根拠**:
- 時刻ソート可能（UUIDv4と異なり生成順で並ぶ）→ SQLiteの INSERT性能とソートに有利
- 128bit（UUIDと同等のユニーク性）
- 将来のクラウド同期時にサーバー側IDとの衝突を回避可能
- ライブラリ: `ulid` (TypeScript)

### 6. リアクティブ補完: invalidation pattern

**決定**: Zustand の invalidation counter パターン

**根拠**:
- expo-sqlite にはリアクティブクエリ（変更監視）がない
- Zustand ストアに `_version: number` カウンターを持ち、DBへの書き込み後にインクリメント
- UI側は version の変化を `useEffect` で検知してリポジトリから再フェッチ
- 軽量で理解しやすく、MVPの9画面に対して十分

## ベストプラクティス調査

### expo-sqlite のベストプラクティス
- `openDatabaseAsync()` で非同期初期化。アプリ起動時に1回のみ
- `execAsync()` でバッチSQL実行（マイグレーション・シード）
- `runAsync()` / `getFirstAsync()` / `getAllAsync()` で個別クエリ
- WALモード有効化: `PRAGMA journal_mode = WAL` → 読み書き並行性能向上
- プリペアドステートメントでSQLインジェクション防止
- トランザクション: `withTransactionAsync()` でワークアウト完了時の一括処理

### Zustand のベストプラクティス
- セレクターで部分購読: `useStore((s) => s.field)` → 不要な再レンダリング回避
- `immer` ミドルウェアでネストした状態の更新を簡潔に
- `persist` ミドルウェアは使用しない（永続化はSQLiteに委譲）
- `subscribeWithSelector` でストア外からの変更監視（タイマー等）

### React Navigation 7 のベストプラクティス
- 型安全: `RootStackParamList` 等の型定義で navigation props を型チェック
- `presentation: 'modal'` / `'transparentModal'` / `'fullScreenModal'` の使い分け
- `screenListeners` で画面フォーカス時のデータ再読み込み
- カスタム `tabBarButton` で [+] ボタン実装
