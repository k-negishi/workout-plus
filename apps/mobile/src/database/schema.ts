/**
 * SQLiteスキーマ定義
 * data-model.md のDDLに準拠
 */

/** exercises テーブル */
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

/** workouts テーブル */
export const CREATE_WORKOUTS_TABLE = `
CREATE TABLE IF NOT EXISTS workouts (
  id               TEXT PRIMARY KEY,
  status           TEXT NOT NULL DEFAULT 'recording',
  created_at       INTEGER NOT NULL,
  started_at       INTEGER,
  completed_at     INTEGER,
  timer_status     TEXT NOT NULL DEFAULT 'notStarted',
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,
  timer_started_at INTEGER,
  memo             TEXT
);
`;

/** workout_exercises テーブル */
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

/** sets テーブル */
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

/** personal_records テーブル */
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
