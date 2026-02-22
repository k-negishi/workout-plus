# Research: タイマー停止確認モーダル

**Feature**: 004-timer-stop-confirm
**Date**: 2026-02-22

---

## 決定事項

### 1. `TimerStatus` に `'discarded'` を追加する

- **決定**: 既存の `'notStarted' | 'running' | 'paused'` に `'discarded'` を追加する
- **根拠**:
  - `'notStarted'` との意味的区別が必要。「一度も計測していない」と「計測を途中でやめた」は別物
  - `discarded` の識別子をサマリー画面の表示ロジックに使用できる（`elapsedSeconds === 0` だけでは判断できない）
  - TypeScriptの型として列挙することで、実装漏れをコンパイル時に検出可能
- **検討した代替案**:
  - `'stopped'` という値名 → `discarded` の方が「タイマーを手動破棄した」という意味が明確
  - `elapsed_seconds` を `null` にするDB変更 → スキーマ変更（マイグレーション必要）でコストが高い。`timer_status = 'discarded'` の方がシンプル

### 2. DBマイグレーション不要

- **決定**: `workouts` テーブルに変更を加えない
- **根拠**:
  - `timer_status` カラムは `TEXT` 型のため、新しい値 `'discarded'` をそのまま格納可能
  - `elapsed_seconds` は `INTEGER NOT NULL DEFAULT 0` で、discarded 時は `0` のまま（変更不要）
  - マイグレーションを追加すると `LATEST_VERSION` 更新が必要で、開発中の既存DBが再初期化されるリスクがある
- **検討した代替案**:
  - `timer_status` カラムに `CHECK` 制約がある場合はマイグレーション必要 → 現行スキーマに `CHECK` 制約はないため不要

### 3. 確認モーダルは `Alert.alert` を使用

- **決定**: `Alert.alert` で確認ダイアログを表示する
- **根拠**:
  - 既存の `handleDiscard` が `Alert.alert` を使用しており、アプリ内の一貫性を維持できる
  - カスタムモーダル実装は引き算のデザイン原則（Constitution II）に反する
  - React Native ネイティブのアラートは OS 標準UIで信頼感がある
- **検討した代替案**:
  - カスタムBottomSheet / Modal コンポーネント → オーバーエンジニアリング

### 4. `stopTimer()` を `useTimer` フックに追加

- **決定**: `useTimer` フックに `stopTimer()` 関数を追加する
- **根拠**:
  - タイマー状態管理のロジックは `useTimer` に集約されており、単一責任原則を守れる
  - `RecordScreen` がタイマー操作の詳細を知る必要がない（インターフェース分離）
  - 既存の `resetTimer()` とは異なる（resetTimer は `notStarted` に戻す; stopTimer は `discarded` に遷移）
- **実装内容**:
  - `timerStatus → 'discarded'`
  - `elapsedSeconds → 0`
  - `timerStartedAt → null`
  - DB永続化: `WorkoutRepository.update()` で `timer_status: 'discarded', elapsed_seconds: 0, timer_started_at: null`

### 5. `TimerBar` の `onDiscard` を `onStopTimer` にリネーム + UI更新

- **決定**: プロップ名を変更し、`discarded` 状態のUIを追加する
- **根拠**:
  - `onDiscard` という名前が「ワークアウト全体を破棄する」というセマンティクスを持ち、新しい動作と矛盾する
  - `discarded` 状態では × ボタンを非表示にして再操作を防ぐ（Constitution II: 不要な要素を削る）
  - `discarded` 状態では ▶ ボタンを無効化する（再計測不可を明示）
  - 経過時間表示の代わりに「時間なし」とグレーで表示する

### 6. `WorkoutSummaryScreen` の所要時間表示を `discarded` 対応にする

- **決定**: DBから `timer_status` も取得し、`'discarded'` の場合は「―」を表示する
- **根拠**:
  - `elapsed_seconds = 0` だけでは「未計測」と「0分で完了」を区別できない（現実的には0分はないが）
  - `timer_status = 'discarded'` という明示的な判定の方がロジックが明確
