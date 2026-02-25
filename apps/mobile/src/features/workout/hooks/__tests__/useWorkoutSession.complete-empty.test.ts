/**
 * completeWorkout: 全種目が空/不完全な場合のワークアウト破棄テスト
 *
 * Issue #163 追加:
 * 有効種目が0件になった場合、workouts テーブルの UNIQUE INDEX (workout_date) に
 * 違反しないよう、WorkoutRepository.update (completed) ではなく
 * WorkoutRepository.delete を呼んでワークアウトを破棄する。
 *
 * テスト戦略:
 * - renderHook で実際のフックを描画し completeWorkout() を呼ぶ
 * - WorkoutRepository.delete / update の呼び出しを検証する
 * - 有効セットが残る場合は従来通り update が呼ばれることも確認する（後退防止）
 */
import { renderHook } from '@testing-library/react-native';
import { act } from 'react';

import { PersonalRecordRepository } from '@/database/repositories/pr';
import { SetRepository } from '@/database/repositories/set';
import { WorkoutRepository } from '@/database/repositories/workout';
import { WorkoutExerciseRepository } from '@/database/repositories/workoutExercise';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';

import { useWorkoutSession } from '../useWorkoutSession';

jest.mock('@/database/repositories/set');
jest.mock('@/database/repositories/workoutExercise');
jest.mock('@/database/repositories/workout');
jest.mock('@/database/repositories/pr');
jest.mock('@/shared/components/Toast', () => ({
  showErrorToast: jest.fn(),
}));

const mockWorkoutDelete = WorkoutRepository.delete as jest.MockedFunction<
  typeof WorkoutRepository.delete
>;
const mockWorkoutUpdate = WorkoutRepository.update as jest.MockedFunction<
  typeof WorkoutRepository.update
>;
const mockSetDelete = SetRepository.delete as jest.MockedFunction<typeof SetRepository.delete>;
const mockExerciseDelete = WorkoutExerciseRepository.delete as jest.MockedFunction<
  typeof WorkoutExerciseRepository.delete
>;
const mockFindByExerciseId = PersonalRecordRepository.findByExerciseId as jest.MockedFunction<
  typeof PersonalRecordRepository.findByExerciseId
>;

/** テスト共通データ */
const mockWorkout: Workout = {
  id: 'workout-1',
  status: 'recording',
  createdAt: Date.now(),
  startedAt: null,
  completedAt: null,
  timerStatus: 'not_started',
  elapsedSeconds: 0,
  timerStartedAt: null,
  memo: null,
};

const mockExercise: WorkoutExercise = {
  id: 'we-1',
  workoutId: 'workout-1',
  exerciseId: 'exercise-1',
  displayOrder: 0,
  memo: null,
  createdAt: Date.now(),
};

function makeSet(
  id: string,
  weight: number | null,
  reps: number | null,
  setNumber = 1,
): WorkoutSet {
  return {
    id,
    workoutExerciseId: 'we-1',
    setNumber,
    weight,
    reps,
    estimated1RM: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** テスト前にストアを初期化し、指定のセットを設定するヘルパー */
function setupStoreWithSets(sets: WorkoutSet[]): void {
  const store = useWorkoutSessionStore.getState();
  store.reset();
  store.setCurrentWorkout(mockWorkout);
  store.addExercise(mockExercise);
  store.setSetsForExercise('we-1', sets);
}

describe('completeWorkout: 有効種目が0件の場合はワークアウトを破棄する（UNIQUE制約回避）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkoutDelete.mockResolvedValue(undefined);
    mockWorkoutUpdate.mockResolvedValue(undefined);
    mockSetDelete.mockResolvedValue(undefined);
    mockExerciseDelete.mockResolvedValue(undefined);
    mockFindByExerciseId.mockResolvedValue([]);
  });

  /**
   * 主要シナリオ: 全セットが null/null（デフォルト状態のまま）
   * 種目を追加したが何も入力せずに終了した場合
   */
  it('全セットが null/null の場合、WorkoutRepository.delete が呼ばれ update は呼ばれない', async () => {
    setupStoreWithSets([
      makeSet('s1', null, null),
      makeSet('s2', null, null, 2),
      makeSet('s3', null, null, 3),
    ]);

    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(mockWorkoutDelete).toHaveBeenCalledWith('workout-1');
    expect(mockWorkoutUpdate).not.toHaveBeenCalled();
  });

  /**
   * 全セットが片方 null（不完全入力）の場合も破棄される
   */
  it('全セットが不完全（片方 null）の場合、WorkoutRepository.delete が呼ばれる', async () => {
    setupStoreWithSets([
      makeSet('s1', 80, null), // reps=null → 不完全
      makeSet('s2', null, 10, 2), // weight=null → 不完全
    ]);

    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(mockWorkoutDelete).toHaveBeenCalledWith('workout-1');
    expect(mockWorkoutUpdate).not.toHaveBeenCalled();
  });

  /**
   * 全セットが reps=0（未実施扱い）の場合も破棄される
   */
  it('全セットが reps=0 の場合、WorkoutRepository.delete が呼ばれる', async () => {
    setupStoreWithSets([makeSet('s1', 80, 0), makeSet('s2', 90, 0, 2)]);

    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(mockWorkoutDelete).toHaveBeenCalledWith('workout-1');
    expect(mockWorkoutUpdate).not.toHaveBeenCalled();
  });

  /**
   * 破棄時は exerciseCount=0 のサマリーを返す（エラーを投げない）
   */
  it('completeWorkout が成功し exerciseCount=0 のサマリーを返す（エラーなし）', async () => {
    setupStoreWithSets([makeSet('s1', null, null)]);

    const { result } = renderHook(() => useWorkoutSession());

    let summary;
    await act(async () => {
      summary = await result.current.completeWorkout();
    });

    expect(summary).toMatchObject({
      exerciseCount: 0,
      setCount: 0,
      totalVolume: 0,
    });
  });

  /**
   * 後退防止: 有効セットが1件以上ある場合は WorkoutRepository.update が呼ばれる
   */
  it('有効なセットが1件ある場合、WorkoutRepository.update が呼ばれ delete は呼ばれない', async () => {
    setupStoreWithSets([
      makeSet('s1', 80, 10), // 有効セット
      makeSet('s2', null, null, 2), // 不完全 → 削除対象（種目は残る）
    ]);

    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(mockWorkoutUpdate).toHaveBeenCalledWith(
      'workout-1',
      expect.objectContaining({ status: 'completed' }),
    );
    expect(mockWorkoutDelete).not.toHaveBeenCalled();
  });
});
