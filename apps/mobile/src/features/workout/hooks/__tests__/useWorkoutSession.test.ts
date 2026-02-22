/**
 * useWorkoutSession ユニットテスト
 * ストアの状態管理ロジックをテストする
 *
 * 注意: DB操作を伴うフックのため、ここではストアの状態変更ロジックを中心にテストする
 * E2Eテストは別途実施
 */
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';

describe('useWorkoutSession - ストア操作テスト', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().reset();
  });

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

  const mockSet: WorkoutSet = {
    id: 'set-1',
    workoutExerciseId: 'we-1',
    setNumber: 1,
    weight: 80,
    reps: 10,
    estimated1RM: 107,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('ワークアウトをセットできる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);

    const state = useWorkoutSessionStore.getState();
    expect(state.currentWorkout).toEqual(mockWorkout);
  });

  it('種目を追加できる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);

    const state = useWorkoutSessionStore.getState();
    expect(state.currentExercises).toHaveLength(1);
    expect(state.currentExercises[0]).toEqual(mockExercise);
  });

  it('種目を削除すると関連セットも削除される', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);
    store.setSetsForExercise('we-1', [mockSet]);

    // 削除前の確認
    expect(useWorkoutSessionStore.getState().currentExercises).toHaveLength(1);
    expect(useWorkoutSessionStore.getState().currentSets['we-1']).toHaveLength(1);

    // 削除実行
    store.removeExercise('we-1');

    const state = useWorkoutSessionStore.getState();
    expect(state.currentExercises).toHaveLength(0);
    expect(state.currentSets['we-1']).toBeUndefined();
  });

  it('セットを一括セットできる', () => {
    const store = useWorkoutSessionStore.getState();
    const sets: WorkoutSet[] = [
      mockSet,
      { ...mockSet, id: 'set-2', setNumber: 2, weight: 85, reps: 8 },
    ];
    store.setSetsForExercise('we-1', sets);

    const state = useWorkoutSessionStore.getState();
    expect(state.currentSets['we-1']).toHaveLength(2);
    expect(state.currentSets['we-1']![0]!.weight).toBe(80);
    expect(state.currentSets['we-1']![1]!.weight).toBe(85);
  });

  it('個別セットを部分更新できる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setSetsForExercise('we-1', [mockSet]);

    store.updateSet('we-1', 'set-1', { weight: 90 });

    const state = useWorkoutSessionStore.getState();
    expect(state.currentSets['we-1']![0]!.weight).toBe(90);
    expect(state.currentSets['we-1']![0]!.reps).toBe(10); // 変更なし
  });

  it('複数セットのうち1つだけ更新し、他は変更されない', () => {
    const store = useWorkoutSessionStore.getState();
    const set2: WorkoutSet = { ...mockSet, id: 'set-2', setNumber: 2, weight: 70, reps: 12 };
    store.setSetsForExercise('we-1', [mockSet, set2]);

    // set-1 のみ更新
    store.updateSet('we-1', 'set-1', { weight: 100 });

    const state = useWorkoutSessionStore.getState();
    // 更新対象のセット
    expect(state.currentSets['we-1']![0]!.weight).toBe(100);
    // 非対象のセットは変更されない（: s の分岐をカバー）
    expect(state.currentSets['we-1']![1]!.weight).toBe(70);
    expect(state.currentSets['we-1']![1]!.reps).toBe(12);
  });

  it('リセットで全状態が初期化される', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);
    store.setSetsForExercise('we-1', [mockSet]);
    store.setTimerStatus('running');
    store.setElapsedSeconds(120);

    store.reset();

    const state = useWorkoutSessionStore.getState();
    expect(state.currentWorkout).toBeNull();
    expect(state.currentExercises).toHaveLength(0);
    expect(Object.keys(state.currentSets)).toHaveLength(0);
    expect(state.timerStatus).toBe('not_started');
    expect(state.elapsedSeconds).toBe(0);
  });

  it('setExercises で種目リストを一括セットできる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);

    const newExercise: WorkoutExercise = { ...mockExercise, id: 'we-new' };
    store.setExercises([newExercise]);

    const state = useWorkoutSessionStore.getState();
    // addExercise で追加した内容は上書きされ、setExercises の内容になる
    expect(state.currentExercises).toHaveLength(1);
    expect(state.currentExercises[0]!.id).toBe('we-new');
  });

  it('incrementInvalidation でカウンターが増加する', () => {
    const store = useWorkoutSessionStore.getState();
    expect(useWorkoutSessionStore.getState().invalidationCounter).toBe(0);
    store.incrementInvalidation();
    expect(useWorkoutSessionStore.getState().invalidationCounter).toBe(1);
    store.incrementInvalidation();
    expect(useWorkoutSessionStore.getState().invalidationCounter).toBe(2);
  });

  it('複数種目を順序通り追加できる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);

    const exercise2: WorkoutExercise = {
      ...mockExercise,
      id: 'we-2',
      exerciseId: 'exercise-2',
      displayOrder: 1,
    };

    store.addExercise(mockExercise);
    store.addExercise(exercise2);

    const state = useWorkoutSessionStore.getState();
    expect(state.currentExercises).toHaveLength(2);
    expect(state.currentExercises[0]!.id).toBe('we-1');
    expect(state.currentExercises[1]!.id).toBe('we-2');
  });
});

describe('workoutSessionStore - 継続モードフィールド', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().reset();
  });

  it('continuationBaseExerciseIds の初期値が null', () => {
    const state = useWorkoutSessionStore.getState();
    expect(state.continuationBaseExerciseIds).toBeNull();
  });

  it('setContinuationBaseExerciseIds で値をセットできる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setContinuationBaseExerciseIds(['ex-1', 'ex-2']);
    expect(useWorkoutSessionStore.getState().continuationBaseExerciseIds).toEqual(['ex-1', 'ex-2']);
  });

  // T04: pendingContinuationWorkoutId 廃止。テストを削除済み。

  it('reset() で continuationBaseExerciseIds が null にリセットされる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setContinuationBaseExerciseIds(['ex-1']);
    store.reset();
    const state = useWorkoutSessionStore.getState();
    expect(state.continuationBaseExerciseIds).toBeNull();
  });
});

describe('workoutSessionStore - 過去日付記録フィールド', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().reset();
  });

  it('calendarSelectedDate の初期値が null', () => {
    const state = useWorkoutSessionStore.getState();
    expect(state.calendarSelectedDate).toBeNull();
  });

  it('setCalendarSelectedDate で日付をセットできる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCalendarSelectedDate('2026-02-14');
    expect(useWorkoutSessionStore.getState().calendarSelectedDate).toBe('2026-02-14');
  });

  it('sessionTargetDate の初期値が null', () => {
    const state = useWorkoutSessionStore.getState();
    expect(state.sessionTargetDate).toBeNull();
  });

  it('setSessionTargetDate で日付をセットできる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setSessionTargetDate('2026-02-14');
    expect(useWorkoutSessionStore.getState().sessionTargetDate).toBe('2026-02-14');
  });

  it('reset() で calendarSelectedDate と sessionTargetDate が null にリセットされる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setCalendarSelectedDate('2026-02-14');
    store.setSessionTargetDate('2026-02-14');
    store.reset();
    const state = useWorkoutSessionStore.getState();
    expect(state.calendarSelectedDate).toBeNull();
    expect(state.sessionTargetDate).toBeNull();
  });
});
