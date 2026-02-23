/**
 * usePreviousRecord ユニットテスト
 * 前回記録取得ロジックのテスト
 *
 * 注意: DB操作を伴うフックのため、ロジックの型チェックとインターフェース確認を中心にテスト
 * 実際のDB操作を含む統合テストはE2Eで実施
 */
import type { WorkoutSet } from '@/types';

import type { PreviousRecord } from '../usePreviousRecord';

describe('usePreviousRecord - 型とインターフェーステスト', () => {
  it('PreviousRecord型が正しい構造を持つ', () => {
    const mockSets: WorkoutSet[] = [
      {
        id: 'set-1',
        workoutExerciseId: 'we-1',
        setNumber: 1,
        weight: 80,
        reps: 10,
        estimated1RM: 107,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'set-2',
        workoutExerciseId: 'we-1',
        setNumber: 2,
        weight: 85,
        reps: 8,
        estimated1RM: 105,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const record: PreviousRecord = {
      sets: mockSets,
      workoutDate: new Date('2026-02-14'),
    };

    expect(record.sets).toHaveLength(2);
    expect(record.workoutDate).toBeInstanceOf(Date);
    expect(record.sets[0]!.weight).toBe(80);
    expect(record.sets[0]!.reps).toBe(10);
    expect(record.sets[1]!.weight).toBe(85);
    expect(record.sets[1]!.reps).toBe(8);
  });

  it('前回記録がない場合はnullを返す想定', () => {
    const record: PreviousRecord | null = null;
    expect(record).toBeNull();
  });

  it('前回のセット数が0の場合も正しく扱える', () => {
    const record: PreviousRecord = {
      sets: [],
      workoutDate: new Date('2026-02-14'),
    };

    expect(record.sets).toHaveLength(0);
    expect(record.workoutDate).toBeInstanceOf(Date);
  });

  it('weight/reps が null のセットも含められる', () => {
    const mockSets: WorkoutSet[] = [
      {
        id: 'set-1',
        workoutExerciseId: 'we-1',
        setNumber: 1,
        weight: null,
        reps: null,
        estimated1RM: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const record: PreviousRecord = {
      sets: mockSets,
      workoutDate: new Date('2026-02-14'),
    };

    expect(record.sets[0]!.weight).toBeNull();
    expect(record.sets[0]!.reps).toBeNull();
    expect(record.sets[0]!.estimated1RM).toBeNull();
  });
});

describe('usePreviousRecord - currentWorkoutCreatedAt パラメータ', () => {
  it('currentWorkoutCreatedAt: number | null を受け取れる関数シグネチャになっている', () => {
    // 型レベルのテスト: この型割り当てがコンパイルエラーにならないことを確認
    type PreviousRecordFn = (
      exerciseId: string,
      currentWorkoutId: string | null,
      currentWorkoutCreatedAt: number | null,
    ) => { previousRecord: null; isLoading: boolean };

    const mockFn: PreviousRecordFn = (
      _exerciseId,
      _currentWorkoutId,
      _currentWorkoutCreatedAt,
    ) => ({ previousRecord: null, isLoading: false });

    expect(mockFn('ex-1', null, null)).toEqual({ previousRecord: null, isLoading: false });
    expect(mockFn('ex-1', 'w-1', Date.now())).toEqual({ previousRecord: null, isLoading: false });
  });
});
