# Data Model: ワークアウト記録コア画面

**Feature**: `001-workout-core-screens`
**Date**: 2026-02-21
**Storage**: SQLite (expo-sqlite) — ローカルファースト

## エンティティ関係図

```
exercises (種目マスタ)
    │
    ├──< workout_exercises (ワークアウト内種目)
    │       │
    │       └──< sets (セット)
    │
    └──< personal_records (PR)
           │
workouts (ワークアウト)
    │
    ├──< workout_exercises
    │
    └──< personal_records (workout_id参照)
```

- `<` は 1:N の関係を示す
- exercises : workout_exercises = 1:N
- workouts : workout_exercises = 1:N
- workout_exercises : sets = 1:N
- exercises : personal_records = 1:N (exercise_id + pr_type でユニーク)

## SQLite スキーマ定義

### exercises テーブル（種目マスタ）

```sql
CREATE TABLE exercises (
  id            TEXT PRIMARY KEY,           -- ULID
  name          TEXT NOT NULL,              -- 種目名（例: ベンチプレス）
  muscle_group  TEXT NOT NULL,              -- 部位: chest/back/legs/shoulders/biceps/triceps/abs
  equipment     TEXT NOT NULL,              -- 器具: barbell/dumbbell/machine/cable/bodyweight
  is_custom     INTEGER NOT NULL DEFAULT 0, -- 0=プリセット, 1=ユーザー作成
  is_favorite   INTEGER NOT NULL DEFAULT 0, -- 0=通常, 1=お気に入り
  created_at    INTEGER NOT NULL,           -- Unix timestamp (ms)
  updated_at    INTEGER NOT NULL            -- Unix timestamp (ms)
);

CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX idx_exercises_is_favorite ON exercises(is_favorite);
CREATE INDEX idx_exercises_is_custom ON exercises(is_custom);
```

**フィールド制約**:
- `muscle_group`: `chest` | `back` | `legs` | `shoulders` | `biceps` | `triceps` | `abs` の7値
- `equipment`: `barbell` | `dumbbell` | `machine` | `cable` | `bodyweight` の5値
- 表示フォーマット: 「部位 • 器具」形式（例: 「胸 • バーベル」）
- カスタム種目の名前が既存と重複する場合: 作成を許可（「カスタム」ラベルで区別）

### workouts テーブル（ワークアウト）

```sql
CREATE TABLE workouts (
  id               TEXT PRIMARY KEY,                      -- ULID
  status           TEXT NOT NULL DEFAULT 'recording',     -- recording/completed
  created_at       INTEGER NOT NULL,                      -- 「+」ボタンタップ時刻 (Unix ms)
  started_at       INTEGER,                               -- タイマー初回開始時刻 (nullable)
  completed_at     INTEGER,                               -- 「完了」ボタンタップ時刻 (nullable)
  timer_status     TEXT NOT NULL DEFAULT 'notStarted',    -- notStarted/running/paused
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,            -- タイマー累積秒数（一時停止中を含まない）
  timer_started_at INTEGER,                               -- 直近のrunning開始時刻 (nullable)
  memo             TEXT                                   -- ワークアウト全体メモ (nullable)
);

CREATE INDEX idx_workouts_status ON workouts(status);
CREATE INDEX idx_workouts_created_at ON workouts(created_at);
CREATE INDEX idx_workouts_completed_at ON workouts(completed_at);
```

**フィールド制約**:
- `status`: `recording` | `completed` の2値のみ（不可逆遷移）
- `timer_status`: `notStarted` | `running` | `paused` の3値
- `started_at`: タイマー未使用の場合 null。所要時間表示は「--」
- ホーム画面・カレンダー・PR判定の対象は `status = 'completed'` のみ
- MVPでは1日1ワークアウトのみ

**所要時間の算出**:
- `started_at` が null → 「--」表示
- `started_at` が non-null → `completed_at - started_at` を表示

### workout_exercises テーブル（ワークアウト内種目）

```sql
CREATE TABLE workout_exercises (
  id            TEXT PRIMARY KEY,                                          -- ULID
  workout_id    TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL REFERENCES exercises(id),
  display_order INTEGER NOT NULL,                                          -- 表示順
  memo          TEXT,                                                      -- 種目メモ (nullable)
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
```

**フィールド制約**:
- `display_order`: 0始まりの連番。セット削除後に振り直し
- 全セット削除時 → この行も即時削除（0セットの種目レコードは保存しない）

### sets テーブル（セット）

```sql
CREATE TABLE sets (
  id                  TEXT PRIMARY KEY,                                                -- ULID
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,                                                -- 1始まり
  weight              REAL,                                                            -- kg (nullable = 未入力)
  reps                INTEGER,                                                         -- 回数 (nullable = 未入力)
  estimated_1rm       REAL,                                                            -- Epley式算出値 (nullable)
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_sets_workout_exercise_id ON sets(workout_exercise_id);
```

**フィールド制約**:
- `weight`: 0〜999 kg、0.5kg刻み。null = 未入力
- `reps`: 0〜999 整数。null = 未入力
- `estimated_1rm`: `weight * (1 + reps / 30)` (Epley式)。weight or reps が null なら null
- 完了時: null セットは除外して保存（weight と reps が両方 null のセット）
- 下書き保存時: null セットも含めて保存

### personal_records テーブル（PR）

```sql
CREATE TABLE personal_records (
  id          TEXT PRIMARY KEY,                          -- ULID
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  pr_type     TEXT NOT NULL,                             -- max_weight/max_volume/max_reps
  value       REAL NOT NULL,
  workout_id  TEXT NOT NULL REFERENCES workouts(id),     -- PR達成時のワークアウト
  achieved_at INTEGER NOT NULL,                          -- PR達成時刻
  UNIQUE(exercise_id, pr_type)
);

CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
```

**フィールド制約**:
- `pr_type` 3種類:
  - `max_weight`: 単一セットの最大重量 (kg)
  - `max_volume`: 1セッション内のその種目の全セット合計 (Σ weight × reps)
  - `max_reps`: 任意の重量での単一セット最大レップ数
- PR判定タイミング: 完了ボタン押下後に判定（リアルタイム判定はMVPスコープ外）
- 編集・削除時: その種目のPRを全履歴から再計算して更新
- `UNIQUE(exercise_id, pr_type)`: 各種目×各タイプで最新のPRのみ保持

## 状態遷移

### Workout ライフサイクル

```
[新規作成] ──→ recording ──→ completed
  (「+」タップ)     │           (「完了」タップ)
                    │
                    ├── 下書き保存（種目1件以上でタブ遷移時）
                    ├── 破棄（「×」→確認→破棄: レコード削除）
                    └── 復帰（recording中に「+」タップ: 既存を表示）
```

- recording → completed は不可逆
- recording 中のワークアウトは同時に1つのみ
- 種目0件の場合、下書き保存しない
- 完了時に null セットを除外

### Timer 状態遷移

```
notStarted ──→ running ←──→ paused
  (開始ボタン)    (一時停止)   (再開)
```

- `notStarted` → `running`: 初回のみ `started_at` も設定
- `running` → `paused`: `elapsed_seconds += (now - timer_started_at)`, `timer_started_at = null`
- `paused` → `running`: `timer_started_at = now`
- バックグラウンド復帰時: `elapsed_seconds + (now - timer_started_at)` で正確な値を算出

## バリデーションルール

| フィールド | ルール |
|-----------|--------|
| weight | 0〜999 (REAL)、0.5kg刻み、nullable |
| reps | 0〜999 (INTEGER)、nullable |
| exercise.name | 空文字不可。重複許可（カスタムラベルで区別） |
| exercise.muscle_group | 7値の enum |
| exercise.equipment | 5値の enum |
| workout per day | MVPでは1日1件のみ |

## プリセットシードデータ

各部位ごとに代表的な種目をプリセット（合計約50種目）:

| 部位 | 種目例 |
|------|--------|
| 胸 (chest) | ベンチプレス, ダンベルフライ, インクラインベンチプレス, チェストプレス, ディップス |
| 背中 (back) | デッドリフト, ラットプルダウン, ベントオーバーロウ, シーテッドロウ, チンアップ |
| 脚 (legs) | スクワット, レッグプレス, レッグカール, レッグエクステンション, カーフレイズ |
| 肩 (shoulders) | オーバーヘッドプレス, サイドレイズ, フロントレイズ, フェイスプル, アップライトロウ |
| 二頭 (biceps) | バーベルカール, ダンベルカール, ハンマーカール, プリーチャーカール |
| 三頭 (triceps) | トライセップスプッシュダウン, オーバーヘッドエクステンション, クローズグリップベンチ, スカルクラッシャー |
| 腹 (abs) | クランチ, プランク, レッグレイズ, アブローラー, ハンギングレッグレイズ |

## マイグレーション戦略

- `PRAGMA user_version` でスキーマバージョンを管理
- アプリ起動時にバージョンをチェックし、必要なマイグレーションを順次適用
- マイグレーションは `withTransactionAsync()` 内で実行（原子性保証）
- 初回起動時: 全テーブル作成 → プリセットシード投入
