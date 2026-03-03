/**
 * useWorkoutSession Bug 1 修正テスト（renderHook ベース）
 *
 * Bug 1: completeWorkout が elapsed_seconds / timer_status を DB に保存していない
 *
 * このテストは実際の completeWorkout() フック関数を renderHook で呼び出して検証する。
 * シミュレーション関数ではなく本物のプロダクションコードを実行するため、
 * プロダクションコードのバグ（elapsed_seconds の削除等）を正しく検知できる。
 *
 * ファイル形式が .tsx である理由:
 * - .test.ts は "logic" jest プロジェクト（babel-jest のみ）で動作するが、
 *   renderHook は @testing-library/react-native を要求し React Native のトランスフォームが必要。
 * - .test.tsx は "components" jest プロジェクト（jest-expo）で動作し RN トランスフォームが有効。
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

// リポジトリをモックして DB 呼び出しを記録する
jest.mock('@/database/repositories/set');
jest.mock('@/database/repositories/workoutExercise');
jest.mock('@/database/repositories/workout');
jest.mock('@/database/repositories/pr');
jest.mock('@/shared/components/Toast', () => ({
  showErrorToast: jest.fn(),
}));
// database/client は全リポジトリをモック済みのため呼ばれないが、
// expo-sqlite の ESM parse エラーを防ぐためスタブ化する
jest.mock('@/database/client', () => ({
  getDatabase: jest.fn(),
}));

// モック関数の型付きエイリアス
const mockWorkoutUpdate = WorkoutRepository.update as jest.MockedFunction<
  typeof WorkoutRepository.update
>;
const mockWorkoutDelete = WorkoutRepository.delete as jest.MockedFunction<
  typeof WorkoutRepository.delete
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
  id: 'workout-bug1',
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
  workoutId: 'workout-bug1',
  exerciseId: 'exercise-1',
  displayOrder: 0,
  memo: null,
  createdAt: Date.now(),
};

/** 有効セットを生成するヘルパー */
function makeValidSet(id: string, setNumber = 1): WorkoutSet {
  return {
    id,
    workoutExerciseId: 'we-1',
    setNumber,
    weight: 80,
    reps: 10,
    estimated1RM: 107,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** テスト前にストアをセットアップするヘルパー */
function setupStore(elapsedSeconds: number, timerStatus: Workout['timerStatus']): void {
  const store = useWorkoutSessionStore.getState();
  store.reset();
  store.setCurrentWorkout({ ...mockWorkout, timerStatus, elapsedSeconds });
  store.addExercise(mockExercise);
  store.setSetsForExercise('we-1', [makeValidSet('s1')]);
  // ストアのタイマー状態も明示的にセット
  store.setElapsedSeconds(elapsedSeconds);
  store.setTimerStatus(timerStatus);
}

// ============================================================
// Bug 1: completeWorkout が elapsed_seconds / timer_status を DB に保存すること
// ============================================================

describe('Bug 1: completeWorkout - elapsed_seconds / timer_status を DB に保存する', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutSessionStore.getState().reset();
    mockWorkoutUpdate.mockResolvedValue(undefined);
    mockWorkoutDelete.mockResolvedValue(undefined);
    mockSetDelete.mockResolvedValue(undefined);
    mockExerciseDelete.mockResolvedValue(undefined);
    mockFindByExerciseId.mockResolvedValue([]);
  });

  it('completeWorkout が elapsed_seconds を WorkoutRepository.update に渡すこと', async () => {
    // Arrange: 5分（300秒）経過した状態をストアにセット
    setupStore(300, 'running');

    const { result } = renderHook(() => useWorkoutSession());

    // Act: 実際の completeWorkout() フックを呼び出す
    await act(async () => {
      await result.current.completeWorkout();
    });

    // Assert: WorkoutRepository.update に elapsed_seconds=300 が渡されること
    expect(mockWorkoutUpdate).toHaveBeenCalledWith(
      'workout-bug1',
      expect.objectContaining({
        status: 'completed',
        elapsed_seconds: 300,
      }),
    );
  });

  it('completeWorkout が timer_status を WorkoutRepository.update に渡すこと', async () => {
    // Arrange: タイマーが running 状態
    setupStore(120, 'running');

    const { result } = renderHook(() => useWorkoutSession());

    // Act: 実際の completeWorkout() フックを呼び出す
    await act(async () => {
      await result.current.completeWorkout();
    });

    // Assert: WorkoutRepository.update に timer_status='running' が渡されること
    expect(mockWorkoutUpdate).toHaveBeenCalledWith(
      'workout-bug1',
      expect.objectContaining({
        status: 'completed',
        timer_status: 'running',
      }),
    );
  });

  it('elapsed_seconds が 0 の場合でも DB に保存されること', async () => {
    // Arrange: タイマーを起動していない状態（elapsed_seconds=0、timer_status='not_started'）
    setupStore(0, 'not_started');

    const { result } = renderHook(() => useWorkoutSession());

    // Act: 実際の completeWorkout() フックを呼び出す
    await act(async () => {
      await result.current.completeWorkout();
    });

    // Assert: elapsed_seconds=0 でも undefined ではなく 0 として渡されること
    expect(mockWorkoutUpdate).toHaveBeenCalledWith(
      'workout-bug1',
      expect.objectContaining({
        elapsed_seconds: 0,
        timer_status: 'not_started',
      }),
    );
  });
});
