/**
 * useWorkoutSession 継続モードのテスト
 * 継続モードの状態管理（continuationBaseExerciseIds）を中心にテストする
 */
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

describe('workoutSessionStore - 継続モードの状態管理', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().reset();
  });

  it('setContinuationBaseExerciseIds が正しく動作する', () => {
    const store = useWorkoutSessionStore.getState();
    store.setContinuationBaseExerciseIds(['we-1', 'we-2']);
    expect(useWorkoutSessionStore.getState().continuationBaseExerciseIds).toEqual(['we-1', 'we-2']);
  });

  it('継続モードでない場合（null）は通常モード', () => {
    const state = useWorkoutSessionStore.getState();
    expect(state.continuationBaseExerciseIds).toBeNull();
  });

  it('reset() で continuationBaseExerciseIds が null にリセットされる', () => {
    const store = useWorkoutSessionStore.getState();
    store.setContinuationBaseExerciseIds(['we-1']);
    store.reset();
    expect(useWorkoutSessionStore.getState().continuationBaseExerciseIds).toBeNull();
  });

  it('継続モードで追加した種目（base に含まれない）を特定できる', () => {
    const store = useWorkoutSessionStore.getState();
    // 既存種目2つをベースにセット
    store.setContinuationBaseExerciseIds(['we-base-1', 'we-base-2']);
    // 新規種目を追加（store への追加）
    store.addExercise({
      id: 'we-base-1',
      workoutId: 'w-1',
      exerciseId: 'ex-1',
      displayOrder: 0,
      memo: null,
      createdAt: Date.now(),
    });
    store.addExercise({
      id: 'we-base-2',
      workoutId: 'w-1',
      exerciseId: 'ex-2',
      displayOrder: 1,
      memo: null,
      createdAt: Date.now(),
    });
    store.addExercise({
      id: 'we-new-1',
      workoutId: 'w-1',
      exerciseId: 'ex-3',
      displayOrder: 2,
      memo: null,
      createdAt: Date.now(),
    });

    // baseIds に含まれない種目が新規追加分
    const baseIds = useWorkoutSessionStore.getState().continuationBaseExerciseIds ?? [];
    const newExercises = useWorkoutSessionStore
      .getState()
      .currentExercises.filter((e) => !baseIds.includes(e.id));
    expect(newExercises).toHaveLength(1);
    expect(newExercises[0]!.id).toBe('we-new-1');
  });
});
