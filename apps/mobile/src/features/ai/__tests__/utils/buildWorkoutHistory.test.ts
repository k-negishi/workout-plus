/**
 * buildWorkoutHistoryContext のテスト
 *
 * SQLite のリポジトリをモック化して、
 * - 直近3ヶ月のデータ取得
 * - キーワードによるフィルタリング（Approach A）
 * を検証する。
 */

import { buildWorkoutHistoryContext } from '../../utils/buildWorkoutHistory';

// --- リポジトリのモック ---
// expo-sqlite を使うリポジトリはテスト環境で動かないためモック化する
jest.mock('@/database/repositories/workout', () => ({
  WorkoutRepository: {
    findAllCompleted: jest.fn(),
  },
}));

jest.mock('@/database/repositories/workoutExercise', () => ({
  WorkoutExerciseRepository: {
    findByWorkoutId: jest.fn(),
  },
}));

jest.mock('@/database/repositories/set', () => ({
  SetRepository: {
    findByWorkoutExerciseId: jest.fn(),
  },
}));

// database/client（SQLite 接続）をモック化（buildWorkoutHistory 内の JOIN クエリで使う）
jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getAllAsync: jest.fn(),
  }),
}));

import { SetRepository } from '@/database/repositories/set';
import { WorkoutRepository } from '@/database/repositories/workout';
import { WorkoutExerciseRepository } from '@/database/repositories/workoutExercise';
import type { WorkoutRow } from '@/database/types';
import type { WorkoutSet } from '@/types/workout';

const mockWorkoutRepository = WorkoutRepository as jest.Mocked<typeof WorkoutRepository>;
const mockWorkoutExerciseRepository = WorkoutExerciseRepository as jest.Mocked<
  typeof WorkoutExerciseRepository
>;
const mockSetRepository = SetRepository as jest.Mocked<typeof SetRepository>;

/** テスト用の WorkoutRow を生成するヘルパー */
function makeWorkoutRow(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: 'workout-1',
    status: 'completed',
    created_at: Date.now(),
    started_at: null,
    completed_at: Date.now(),
    timer_status: 'not_started',
    elapsed_seconds: 0,
    timer_started_at: null,
    memo: null,
    workout_date: '2026-02-20',
    ...overrides,
  };
}

/** テスト用の WorkoutSet を生成するヘルパー */
function makeWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-1',
    workoutExerciseId: 'we-1',
    setNumber: 1,
    weight: 60,
    reps: 10,
    estimated1RM: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * JOIN クエリの結果行の型
 * buildWorkoutHistory 内で使う内部型に対応するモックデータ
 */
type WorkoutExerciseWithExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  display_order: number;
  memo: string | null;
  created_at: number;
  name: string;
  muscle_group: string;
};

// getDatabase().getAllAsync() のモックを設定するため、client モックを取得
import { getDatabase } from '@/database/client';
const mockGetDatabase = getDatabase as jest.Mock;

/** JOIN クエリのモック結果を設定するヘルパー */
function mockJoinQueryResult(rows: WorkoutExerciseWithExerciseRow[]) {
  mockGetDatabase.mockResolvedValue({
    getAllAsync: jest.fn().mockResolvedValue(rows),
  });
}

describe('buildWorkoutHistoryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルト: 空データ
    mockWorkoutRepository.findAllCompleted.mockResolvedValue([]);
    mockWorkoutExerciseRepository.findByWorkoutId.mockResolvedValue([]);
    mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([]);
    mockJoinQueryResult([]);
  });

  // -------------------------
  // 基本動作
  // -------------------------

  it('strategy は常に "recent_months" を返すこと', async () => {
    const result = await buildWorkoutHistoryContext('こんにちは');
    expect(result.strategy).toBe('recent_months');
  });

  it('完了済みワークアウトがない場合は空の data を返すこと', async () => {
    mockWorkoutRepository.findAllCompleted.mockResolvedValue([]);
    mockJoinQueryResult([]);

    const result = await buildWorkoutHistoryContext('こんにちは');
    expect(result.data).toHaveLength(0);
  });

  // -------------------------
  // データ変換
  // -------------------------

  it('ワークアウトの date, exercises, memo が正しくマッピングされること', async () => {
    const workout = makeWorkoutRow({ id: 'w1', workout_date: '2026-02-20', memo: 'テストメモ' });
    mockWorkoutRepository.findAllCompleted.mockResolvedValue([workout]);

    mockJoinQueryResult([
      {
        id: 'we-1',
        workout_id: 'w1',
        exercise_id: 'ex-1',
        display_order: 0,
        memo: null,
        created_at: Date.now(),
        name: 'ベンチプレス',
        muscle_group: 'chest',
      },
    ]);

    mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([
      makeWorkoutSet({ weight: 80, reps: 5 }),
    ]);

    const result = await buildWorkoutHistoryContext('最近のトレーニングは？');
    expect(result.data).toHaveLength(1);
    const summary = result.data[0]!;
    expect(summary.date).toBe('2026-02-20');
    expect(summary.memo).toBe('テストメモ');
    expect(summary.exercises).toHaveLength(1);
    expect(summary.exercises[0]!.name).toBe('ベンチプレス');
    expect(summary.exercises[0]!.muscleGroup).toBe('chest');
    expect(summary.exercises[0]!.sets).toEqual([{ weight: 80, reps: 5 }]);
  });

  it('workout_date が null のワークアウトはスキップされること', async () => {
    const workoutWithNullDate = makeWorkoutRow({ id: 'w-null', workout_date: null });
    mockWorkoutRepository.findAllCompleted.mockResolvedValue([workoutWithNullDate]);
    mockJoinQueryResult([]);

    const result = await buildWorkoutHistoryContext('最近のトレーニングは？');
    expect(result.data).toHaveLength(0);
  });

  // -------------------------
  // 直近3ヶ月フィルタリング
  // -------------------------

  it('直近3ヶ月以内のワークアウトのみ返すこと', async () => {
    const now = new Date('2026-02-25');
    // 3ヶ月前 = 2025-11-25。2025-11-24 は期間外として除外される

    // 直近3ヶ月: 2026-02-20（含む）
    const recentWorkout = makeWorkoutRow({
      id: 'w-recent',
      workout_date: '2026-02-20',
      created_at: new Date('2026-02-20').getTime(),
    });

    // 3ヶ月以前: 2025-11-24（除外）
    const oldWorkout = makeWorkoutRow({
      id: 'w-old',
      workout_date: '2025-11-24',
      created_at: new Date('2025-11-24').getTime(),
    });

    mockWorkoutRepository.findAllCompleted.mockResolvedValue([recentWorkout, oldWorkout]);

    // JOIN クエリは最初の呼び出しのみ recent のデータを返す
    const mockDb = {
      getAllAsync: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'we-1',
            workout_id: 'w-recent',
            exercise_id: 'ex-1',
            display_order: 0,
            memo: null,
            created_at: Date.now(),
            name: 'スクワット',
            muscle_group: 'legs',
          },
        ])
        .mockResolvedValueOnce([]), // w-old はフィルタされるため呼ばれない
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

    // jest の Date をモック（現在日時を固定）
    jest.useFakeTimers();
    jest.setSystemTime(now);

    try {
      const result = await buildWorkoutHistoryContext('今月のトレーニングは？');
      const dates = result.data.map((s) => s.date);
      expect(dates).toContain('2026-02-20');
      expect(dates).not.toContain('2025-11-24');
    } finally {
      jest.useRealTimers();
    }
  });

  // -------------------------
  // Approach A: キーワードフィルタリング
  // -------------------------

  describe('キーワードフィルタリング（Approach A）', () => {
    const makeWorkoutsWithExercises = () => {
      const workouts = [
        makeWorkoutRow({ id: 'w1', workout_date: '2026-02-20' }),
        makeWorkoutRow({ id: 'w2', workout_date: '2026-02-15' }),
        makeWorkoutRow({ id: 'w3', workout_date: '2026-02-10' }),
      ];
      return workouts;
    };

    it('種目名キーワードを含むメッセージで該当種目のみに絞り込まれること', async () => {
      const workouts = makeWorkoutsWithExercises();
      mockWorkoutRepository.findAllCompleted.mockResolvedValue(workouts);

      // w1: ベンチプレスあり、w2: スクワットのみ、w3: ベンチプレスあり
      const mockDb = {
        getAllAsync: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'we-1',
              workout_id: 'w1',
              exercise_id: 'ex-1',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'ベンチプレス',
              muscle_group: 'chest',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'we-2',
              workout_id: 'w2',
              exercise_id: 'ex-2',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'スクワット',
              muscle_group: 'legs',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'we-3',
              workout_id: 'w3',
              exercise_id: 'ex-1',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'ベンチプレス',
              muscle_group: 'chest',
            },
          ]),
      };
      mockGetDatabase.mockResolvedValue(mockDb);

      mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

      const result = await buildWorkoutHistoryContext('ベンチプレスの記録を教えて');

      // ベンチプレスを含む w1・w3 のみ残り、w2（スクワットのみ）は除外
      expect(result.data.every((s) => s.exercises.some((e) => e.name === 'ベンチプレス'))).toBe(
        true,
      );
      // ベンチプレスなしの date は含まれない
      const dates = result.data.map((s) => s.date);
      expect(dates).not.toContain('2026-02-15'); // w2
    });

    it('"先週" キーワードで1週間分のデータのみ返すこと', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-25'));

      // 先週: 2026-02-18〜2026-02-25
      const thisWeekWorkout = makeWorkoutRow({
        id: 'w-thisweek',
        workout_date: '2026-02-20',
        created_at: new Date('2026-02-20').getTime(),
      });
      const olderWorkout = makeWorkoutRow({
        id: 'w-older',
        workout_date: '2026-02-10',
        created_at: new Date('2026-02-10').getTime(),
      });

      mockWorkoutRepository.findAllCompleted.mockResolvedValue([thisWeekWorkout, olderWorkout]);

      const mockDb = {
        getAllAsync: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'we-1',
              workout_id: 'w-thisweek',
              exercise_id: 'ex-1',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'デッドリフト',
              muscle_group: 'back',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'we-2',
              workout_id: 'w-older',
              exercise_id: 'ex-2',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'デッドリフト',
              muscle_group: 'back',
            },
          ]),
      };
      mockGetDatabase.mockResolvedValue(mockDb);
      mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

      try {
        const result = await buildWorkoutHistoryContext('先週のトレーニングを振り返りたい');
        const dates = result.data.map((s) => s.date);
        expect(dates).toContain('2026-02-20');
        expect(dates).not.toContain('2026-02-10'); // 1週間より前
      } finally {
        jest.useRealTimers();
      }
    });

    it('"今週" キーワードで1週間分のデータのみ返すこと', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-25'));

      const thisWeekWorkout = makeWorkoutRow({
        id: 'w-thisweek',
        workout_date: '2026-02-22',
        created_at: new Date('2026-02-22').getTime(),
      });
      const olderWorkout = makeWorkoutRow({
        id: 'w-older',
        workout_date: '2026-02-10',
        created_at: new Date('2026-02-10').getTime(),
      });

      mockWorkoutRepository.findAllCompleted.mockResolvedValue([thisWeekWorkout, olderWorkout]);

      const mockDb = {
        getAllAsync: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'we-1',
              workout_id: 'w-thisweek',
              exercise_id: 'ex-1',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'スクワット',
              muscle_group: 'legs',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'we-2',
              workout_id: 'w-older',
              exercise_id: 'ex-2',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'スクワット',
              muscle_group: 'legs',
            },
          ]),
      };
      mockGetDatabase.mockResolvedValue(mockDb);
      mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

      try {
        const result = await buildWorkoutHistoryContext('今週のトレーニングを見て');
        const dates = result.data.map((s) => s.date);
        expect(dates).toContain('2026-02-22');
        expect(dates).not.toContain('2026-02-10');
      } finally {
        jest.useRealTimers();
      }
    });

    it('"先月" キーワードで1ヶ月分のデータのみ返すこと', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-25'));

      const oneMonthAgoWorkout = makeWorkoutRow({
        id: 'w-month',
        workout_date: '2026-02-01',
        created_at: new Date('2026-02-01').getTime(),
      });
      const tooOldWorkout = makeWorkoutRow({
        id: 'w-tooold',
        workout_date: '2025-12-01',
        created_at: new Date('2025-12-01').getTime(),
      });

      mockWorkoutRepository.findAllCompleted.mockResolvedValue([oneMonthAgoWorkout, tooOldWorkout]);

      const mockDb = {
        getAllAsync: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'we-1',
              workout_id: 'w-month',
              exercise_id: 'ex-1',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'ショルダープレス',
              muscle_group: 'shoulders',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'we-2',
              workout_id: 'w-tooold',
              exercise_id: 'ex-2',
              display_order: 0,
              memo: null,
              created_at: Date.now(),
              name: 'ショルダープレス',
              muscle_group: 'shoulders',
            },
          ]),
      };
      mockGetDatabase.mockResolvedValue(mockDb);
      mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

      try {
        const result = await buildWorkoutHistoryContext('先月のトレーニングを見せて');
        const dates = result.data.map((s) => s.date);
        expect(dates).toContain('2026-02-01');
        expect(dates).not.toContain('2025-12-01');
      } finally {
        jest.useRealTimers();
      }
    });

    it('キーワードがない場合はデフォルト（直近3ヶ月）を返すこと', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-25'));

      const workout = makeWorkoutRow({
        id: 'w1',
        workout_date: '2026-01-01',
        created_at: new Date('2026-01-01').getTime(),
      });
      mockWorkoutRepository.findAllCompleted.mockResolvedValue([workout]);

      mockJoinQueryResult([
        {
          id: 'we-1',
          workout_id: 'w1',
          exercise_id: 'ex-1',
          display_order: 0,
          memo: null,
          created_at: Date.now(),
          name: 'ベンチプレス',
          muscle_group: 'chest',
        },
      ]);
      mockSetRepository.findByWorkoutExerciseId.mockResolvedValue([makeWorkoutSet()]);

      try {
        const result = await buildWorkoutHistoryContext('最近のトレーニングについて教えて');
        // 直近3ヶ月なので 2026-01-01 は含まれる
        expect(result.data.map((s) => s.date)).toContain('2026-01-01');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
