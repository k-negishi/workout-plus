# Research: 当日ワークアウト継続登録

**Date**: 2026-02-22
**Feature**: 当日ワークアウト継続登録
**Phase**: Phase 0 – 設計前リサーチ

---

## 現状の記録フロー（ベースライン）

```
+ボタン (MainTabs.tsx)
  → navigation.navigate('RecordStack')
  → RecordScreen マウント
  → useEffect(() => session.startSession(), [])  // 自動実行
  → WorkoutRepository.findRecording()  // recording 状態を探す
    ├─ [あり] 既存セッションを store に復元（タイマー状態含む）
    └─ [なし] WorkoutRepository.create() で新規作成
```

**重要な制約**:
- RecordScreen は現在 `route.params` を受け取らない（型定義: `Record: undefined`）
- `startSession()` は useEffect で自動起動（パラメータなし）
- `WorkoutRepository` に日付検索メソッドが存在しない

---

## 設計決定

### D-001: 継続モードの実装アプローチ

**選択**: 完了済みワークアウトを `recording` に再オープンし、完了時に再度 `completed` に戻す

**比較検討**:

| 案 | 概要 | メリット | デメリット |
|----|------|----------|------------|
| **A（採用）** | 既存ワークアウトの status を `recording` に戻し、既存種目を全て store に読み込む | 1ワークアウトの一貫性を保てる。completeWorkout() が既存のまま使える | discard 時に元の completed 状態へ戻す処理が必要 |
| B | 新規ワークアウトを作成し、後でマージ | 既存ロジックへの影響最小 | 1日1ワークアウト制約に違反。マージ実装が複雑 |
| C | 継続用に完全別フロー（別スクリーン）を実装 | 関心の分離が明確 | コード重複が発生。メンテナンスコスト増大 |

**根拠**: A案が最もデータの一貫性が高く、既存の `completeWorkout()` / サマリー / PR計算ロジックをそのまま流用できる。

---

### D-002: 既存 recording セッションとの優先関係

**決定**: `recording` 状態のセッションが存在する場合は、既存の復帰ロジックを優先する

**根拠**: 仕様の Edge Case 定義どおり。継続機能は `completed` ワークアウトへの追記であり、`recording` の復帰（クラッシュ回復）とは別の概念。

**優先順位**:
1. `recording` セッションあり → 既存の復帰ロジック（変更なし）
2. 当日 `completed` ワークアウトあり → 継続モードで再オープン
3. どちらもなし → 新規作成（既存の動作）

---

### D-003: 継続モードの状態管理

**決定**: Zustand store に `continuationBaseExerciseIds: string[] | null` を追加する

**根拠**:
- discard 時に「元からあった種目」vs「今回追加した種目」を区別する必要がある
- `null` = 継続モードでない（新規 or 復帰）
- `string[]` = 継続モードで、継続開始前から存在した種目の ID リスト

---

### D-004: 当日ワークアウト検索

**決定**: `WorkoutRepository` に `findTodayCompleted()` メソッドを追加する

**根拠**: 日付検索ロジックが `DaySummary.tsx` 等に散在しており、`WorkoutRepository` に集約することで保守性が向上する。DaySummary のロジックをそのまま移植する（`completed_at` のタイムスタンプ範囲フィルタ）。

---

### D-005: RecordStack へのパラメータ追加

**決定**: `RecordStackParamList.Record` の型を `undefined` から `{ workoutId?: string } | undefined` に変更する

**根拠**: 継続モードでは対象のワークアウト ID を RecordScreen に渡す必要がある。`optional` にすることで既存の新規起動フロー（パラメータなし）に影響を与えない。

---

### D-006: 継続モード時の discard 処理

**決定**: 継続モード時の discard は「新規追加した種目のみ削除 + ワークアウトを `completed` に戻す」とする

**具体的な処理**:
1. `continuationBaseExerciseIds` に含まれない種目をDBから削除
2. ワークアウトの status を `completed` に更新（`completed_at` は変更しない）
3. store を reset する

**根拠**: 仕様 FR-006「継続モードを破棄した場合、既存の完了済みデータは変更されてはならない」の実装。

---

### D-007: コンポーネント共通化の方針

**決定**: RecordScreen を継続モードにも流用する（新規スクリーンは作成しない）

**根拠**:
- 継続モードの UI は新規記録と実質的に同じ（種目追加・セット入力・完了）
- `startSession()` の内部挙動（ワークアウト ID の有無）でモードを切り替えることで、RecordScreen 自体への変更を最小化できる
- 「引き算のデザイン」原則に則り、不要な画面を増やさない

---

## 影響を受けるファイル一覧

| ファイル | 変更種別 | 概要 |
|----------|----------|------|
| `src/database/repositories/workout.ts` | 追加 | `findTodayCompleted()` メソッド追加 |
| `src/stores/workoutSessionStore.ts` | 変更 | `continuationBaseExerciseIds` フィールド追加 |
| `src/features/workout/hooks/useWorkoutSession.ts` | 変更 | `startSession()` のシグネチャ変更・継続モード処理追加・`discardWorkout()` の継続モード分岐 |
| `src/types/navigation.ts` | 変更 | `RecordStackParamList.Record` の型を拡張 |
| `src/app/MainTabs.tsx` | 変更 | `+`ボタンの `onPress` に当日ワークアウットチェックを追加 |
| `src/features/workout/screens/RecordScreen.tsx` | 変更 | `route.params.workoutId` を `startSession()` に渡す |

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 継続開始直後にアプリがクラッシュ | ワークアウットが `recording` に変わったまま復帰ロジックが走る | `recording` の復帰ロジックは継続モードを考慮済み（既存種目 = `continuationBaseExerciseIds`）として復元 |
| `completed_at` が再完了で上書きされる | ワークアウットの完了時刻が変わる | 継続モードで完了時は `completed_at` を現在時刻で更新（ユーザーは継続中もトレーニングしているため自然な挙動） |
| 前日の recording セッションが残っている状態で継続ボタンを押す | 意図しない挙動 | `recording` 優先ルール（D-002）により、継続チェックより先に `recording` 復帰が行われる。`+`ボタン側でもこの優先順位を維持 |
