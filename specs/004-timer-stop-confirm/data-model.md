# Data Model: タイマー停止確認モーダル

**Feature**: 004-timer-stop-confirm
**Date**: 2026-02-22

---

## 変更エンティティ

### TimerStatus（型定義変更）

**ファイル**: `apps/mobile/src/types/workout.ts`

```typescript
// 変更前
export type TimerStatus = 'notStarted' | 'running' | 'paused';

// 変更後
export type TimerStatus = 'notStarted' | 'running' | 'paused' | 'discarded';
```

**状態遷移図:**

```
notStarted → running → paused → running（繰り返し可）
                ↓
            discarded（終端状態: 再計測不可）
notStarted → discarded（未開始で × ボタンを押した場合の名義上の遷移）
```

| 状態 | 意味 | ▶ ボタン | × ボタン |
|---|---|---|---|
| `notStarted` | 計測未開始 | 有効（開始） | 有効（確認モーダル表示） |
| `running` | 計測中 | 有効（一時停止） | 有効（確認モーダル表示） |
| `paused` | 一時停止中 | 有効（再開） | 有効（確認モーダル表示） |
| `discarded` | 計測を手動停止 | 無効（グレーアウト） | 非表示 |

---

### workouts テーブル（DBスキーマ変更なし）

**ファイル**: `apps/mobile/src/database/schema.ts`

DBマイグレーション不要。`timer_status` カラムは `TEXT` 型のため `'discarded'` を格納可能。

```sql
-- 変更なし（既存）
CREATE TABLE IF NOT EXISTS workouts (
  id               TEXT PRIMARY KEY,
  status           TEXT NOT NULL DEFAULT 'recording',
  created_at       INTEGER NOT NULL,
  started_at       INTEGER,
  completed_at     INTEGER,
  timer_status     TEXT NOT NULL DEFAULT 'notStarted',  -- 'discarded' も格納可能
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,           -- discarded 時は 0
  timer_started_at INTEGER,
  memo             TEXT
);
```

**`discarded` 状態のレコード例:**

| フィールド | 値 | 備考 |
|---|---|---|
| `timer_status` | `'discarded'` | 新しい値 |
| `elapsed_seconds` | `0` | 計測時間なし |
| `timer_started_at` | `NULL` | 計測中止済み |

---

## 影響を受けるコンポーネント

### UseTimerReturn（型拡張）

**ファイル**: `apps/mobile/src/features/workout/hooks/useTimer.ts`

```typescript
// 追加するメソッド
export type UseTimerReturn = {
  timerStatus: TimerStatus;
  elapsedSeconds: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  stopTimer: () => void;  // 追加: タイマーを discarded 状態に移行
};
```

### TimerBarProps（プロップ変更）

**ファイル**: `apps/mobile/src/features/workout/components/TimerBar.tsx`

```typescript
// 変更前
export type TimerBarProps = {
  ...
  onDiscard: () => void;
  ...
};

// 変更後
export type TimerBarProps = {
  ...
  onStopTimer: () => void;  // onDiscard → onStopTimer
  ...
};
```
