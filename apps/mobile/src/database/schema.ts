/**
 * SQLiteスキーマ定義
 * data-model.md のDDLに準拠
 *
 * ## SQLite 型アフィニティの対応
 *   TEXT    → 文字列リテラル（Union Typeの値をそのまま格納）
 *   INTEGER → 整数（bool は 0|1、タイムスタンプは UNIX ミリ秒 UTC）
 *   REAL    → 浮動小数点（重量 kg・推定1RM計算値）
 *
 * ## 日付カラムの設計方針
 *   全タイムスタンプは UNIX ミリ秒（INTEGER）で統一。
 *   TODO: 将来的に ISO 8601 TEXT（'2026-02-22T10:30:00.000Z'）への移行を検討。
 *         TEXT 化すると SQLite の date()/strftime() が変換不要で使えるため、
 *         カレンダー機能のクエリが簡潔になる（例: WHERE date(created_at) = '2026-02-22'）。
 *
 * ## is_*** フラグの設計方針
 *   is_custom は将来的に TEXT enum（'preset' | 'custom'）への変更を検討。
 *   is_favorite は boolean 的な意味が強いため INTEGER 0|1 のまま維持。
 */

/**
 * exercises テーブル - 種目マスタ（プリセット + ユーザー作成カスタム）
 *
 * @column id            - ULID形式の主キー。タイムスタンプ埋め込みで時刻順ソート可能、UUID互換
 * @column name          - 種目名。プリセットは英語表記、カスタムはユーザー入力
 * @column muscle_group  - 対象部位カテゴリ（MuscleGroup）。有効値: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'abs'
 * @column equipment     - 使用器具タイプ（Equipment）。有効値: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
 * @column is_custom     - 種目の出所フラグ（0: プリセット、1: ユーザー作成カスタム）。カスタムのみ編集・削除可能。TODO: 将来的に TEXT enum（'preset' | 'custom'）への変更を検討
 * @column is_favorite   - お気に入り登録フラグ（0: 通常、1: お気に入り）。種目選択モーダルのフィルタリングに使用
 * @column created_at    - レコード作成日時（UNIX ミリ秒 UTC）
 * @column updated_at    - レコード最終更新日時（UNIX ミリ秒 UTC）。name・muscle_group・equipment・is_favorite の変更時に更新
 */
export const CREATE_EXERCISES_TABLE = `
CREATE TABLE IF NOT EXISTS exercises (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,
  equipment     TEXT NOT NULL,
  is_custom     INTEGER NOT NULL DEFAULT 0,
  is_favorite   INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
`;

/**
 * workouts テーブル - ワークアウトセッション（1回の筋トレ記録）
 *
 * @column id               - ULID形式の主キー
 * @column status           - セッション状態（WorkoutStatus）。有効値: 'recording'=記録中（デフォルト）| 'completed'=完了。recording → completed への一方向遷移のみ
 * @column created_at       - セッション作成日時（UNIX ミリ秒 UTC）。「今日のワークアウト」判定のベースカラム
 * @column started_at       - タイマー初回開始日時（UNIX ミリ秒 UTC）。タイマーを一度も押していない場合は NULL
 * @column completed_at     - セッション完了日時（UNIX ミリ秒 UTC）。status='recording' の間は NULL
 * @column timer_status     - タイマー状態（TimerStatus）。有効値: 'not_started'=未開始 | 'running'=計測中 | 'paused'=一時停止 | 'discarded'=破棄
 * @column elapsed_seconds  - 累計経過秒数。一時停止をまたいで保持される合計時間。表示用経過時間 = elapsed_seconds + (Date.now() - timer_started_at) / 1000
 * @column timer_started_at - 現在の計測区間の開始日時（UNIX ミリ秒 UTC）。timer_status='running' 時のみ有効。paused / not_started / discarded は NULL
 * @column memo             - セッションメモ（任意入力）
 */
export const CREATE_WORKOUTS_TABLE = `
CREATE TABLE IF NOT EXISTS workouts (
  id               TEXT PRIMARY KEY,
  status           TEXT NOT NULL DEFAULT 'recording',
  created_at       INTEGER NOT NULL,
  started_at       INTEGER,
  completed_at     INTEGER,
  timer_status     TEXT NOT NULL DEFAULT 'not_started',
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,
  timer_started_at INTEGER,
  memo             TEXT
);
`;

/**
 * workout_exercises テーブル - ワークアウト内の種目（workouts × exercises の中間テーブル）
 *
 * @column id            - ULID形式の主キー
 * @column workout_id    - 所属ワークアウト（外部キー）。ワークアウト削除時に CASCADE で連鎖削除
 * @column exercise_id   - 参照種目（外部キー）。CASCADE なし: 使用中の種目は削除不可（参照整合性エラー）
 * @column display_order - ワークアウト内の表示順（0始まり）。同一 workout_id 内での重複はアプリ層で保証
 * @column memo          - 種目ごとのメモ（任意入力）
 * @column created_at    - 種目追加日時（UNIX ミリ秒 UTC）
 */
export const CREATE_WORKOUT_EXERCISES_TABLE = `
CREATE TABLE IF NOT EXISTS workout_exercises (
  id            TEXT PRIMARY KEY,
  workout_id    TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL REFERENCES exercises(id),
  display_order INTEGER NOT NULL,
  memo          TEXT,
  created_at    INTEGER NOT NULL
);
`;

/**
 * sets テーブル - セット記録（1セット = 重量 × レップ数）
 *
 * @column id                  - ULID形式の主キー
 * @column workout_exercise_id - 所属ワークアウト種目（外部キー）。種目削除時に CASCADE で連鎖削除
 * @column set_number          - セット番号（1始まり、同一 workout_exercise_id 内で連番）。削除後は Repository 層で採番し直す
 * @column weight              - 重量（kg、NULL許容）。NULL = bodyweight 種目または未入力
 * @column reps                - レップ数（NULL許容）。NULL = 重量のみ記録または未入力
 * @column estimated_1rm       - 推定1RM（kg、NULL許容）。Epley 式: weight * (1 + reps / 30) で自動計算。weight または reps が NULL なら NULL。手動更新不可: weight・reps 変更時に Repository 層が自動再計算
 * @column created_at          - レコード作成日時（UNIX ミリ秒 UTC）
 * @column updated_at          - レコード最終更新日時（UNIX ミリ秒 UTC）。weight・reps 変更時（estimated_1rm 再計算と同時）に更新
 */
export const CREATE_SETS_TABLE = `
CREATE TABLE IF NOT EXISTS sets (
  id                  TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,
  weight              REAL,
  reps                INTEGER,
  estimated_1rm       REAL,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
`;

/**
 * personal_records テーブル - 種目ごとのパーソナルレコード（種目 × PR種別 で1行管理）
 *
 * @column id          - ULID形式の主キー
 * @column exercise_id - 対象種目（外部キー）
 * @column pr_type     - PR種別（PRType）。有効値: 'max_weight'=最大重量(kg) | 'max_volume'=セッション最大総ボリューム(kg) | 'max_reps'=最大レップ数(回)
 * @column value       - PR値。pr_type に応じた単位（max_weight/max_volume → kg、max_reps → 回）
 * @column workout_id  - PR達成ワークアウト（外部キー）。CASCADE なし: ワークアウト削除後も達成記録を保持するため意図的
 * @column achieved_at - PR達成日時（UNIX ミリ秒 UTC）
 * @unique (exercise_id, pr_type) - 種目 × PR種別の組み合わせは1行のみ。UPSERT で最大値を更新する運用
 */
export const CREATE_PERSONAL_RECORDS_TABLE = `
CREATE TABLE IF NOT EXISTS personal_records (
  id          TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  pr_type     TEXT NOT NULL,
  value       REAL NOT NULL,
  workout_id  TEXT NOT NULL REFERENCES workouts(id),
  achieved_at INTEGER NOT NULL,
  UNIQUE(exercise_id, pr_type)
);
`;

/** インデックス定義 */
export const CREATE_INDEXES = [
  // exercises
  'CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);',
  'CREATE INDEX IF NOT EXISTS idx_exercises_is_favorite ON exercises(is_favorite);',
  'CREATE INDEX IF NOT EXISTS idx_exercises_is_custom ON exercises(is_custom);',
  // workouts
  'CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);',
  'CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);',
  // workout_exercises
  'CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);',
  'CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);',
  // sets
  'CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);',
  // personal_records
  'CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);',
];

/** テーブル作成SQL（実行順序考慮: 外部キー依存順） */
export const ALL_CREATE_TABLES = [
  CREATE_EXERCISES_TABLE,
  CREATE_WORKOUTS_TABLE,
  CREATE_WORKOUT_EXERCISES_TABLE,
  CREATE_SETS_TABLE,
  CREATE_PERSONAL_RECORDS_TABLE,
];
