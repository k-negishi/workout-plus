/**
 * exerciseStore テスト
 * Zustand ストアのアクションと状態遷移を検証する
 */
import type { Exercise } from '@/types';

import { useExerciseStore } from '../exerciseStore';

/** テスト用種目データ生成ヘルパー */
function makeExercise(overrides: Partial<Exercise> & { id: string; name: string }): Exercise {
  const now = Date.now();
  return {
    muscleGroup: 'chest',
    equipment: 'barbell',
    isCustom: false,
    isFavorite: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    sortOrder: 0,
    ...overrides,
  };
}

const ex1 = makeExercise({ id: 'ex-1', name: 'ベンチプレス', isFavorite: true });
const ex2 = makeExercise({ id: 'ex-2', name: 'スクワット', muscleGroup: 'legs' });
const ex3 = makeExercise({ id: 'ex-3', name: 'デッドリフト', muscleGroup: 'back' });

describe('exerciseStore', () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useExerciseStore.setState({ exercises: [], invalidationCounter: 0 });
  });

  describe('setExercises', () => {
    it('種目リストを一括セットできる', () => {
      useExerciseStore.getState().setExercises([ex1, ex2]);
      expect(useExerciseStore.getState().exercises).toHaveLength(2);
      expect(useExerciseStore.getState().exercises[0]!.id).toBe('ex-1');
    });

    it('空配列で全件クリアできる', () => {
      useExerciseStore.getState().setExercises([ex1, ex2]);
      useExerciseStore.getState().setExercises([]);
      expect(useExerciseStore.getState().exercises).toHaveLength(0);
    });
  });

  describe('addExercise', () => {
    it('種目を末尾に追加できる', () => {
      useExerciseStore.getState().setExercises([ex1]);
      useExerciseStore.getState().addExercise(ex2);
      const exercises = useExerciseStore.getState().exercises;
      expect(exercises).toHaveLength(2);
      expect(exercises[1]!.id).toBe('ex-2');
    });

    it('空リストに追加できる', () => {
      useExerciseStore.getState().addExercise(ex1);
      expect(useExerciseStore.getState().exercises).toHaveLength(1);
    });
  });

  describe('updateExercise', () => {
    it('指定IDの種目を部分更新できる', () => {
      useExerciseStore.getState().setExercises([ex1, ex2]);
      useExerciseStore.getState().updateExercise('ex-1', { name: 'ナローベンチプレス' });
      const updated = useExerciseStore.getState().exercises.find((e) => e.id === 'ex-1');
      expect(updated!.name).toBe('ナローベンチプレス');
      // 他のフィールドは変更されない
      expect(updated!.isFavorite).toBe(true);
    });

    it('存在しないIDの更新は他の種目に影響しない', () => {
      useExerciseStore.getState().setExercises([ex1, ex2]);
      useExerciseStore.getState().updateExercise('non-existent', { name: '更新後' });
      expect(useExerciseStore.getState().exercises).toHaveLength(2);
      expect(useExerciseStore.getState().exercises[0]!.name).toBe('ベンチプレス');
    });
  });

  describe('toggleFavoriteLocal', () => {
    it('お気に入りをtrue→falseに切り替えられる', () => {
      useExerciseStore.getState().setExercises([ex1]); // ex1はisFavorite: true
      useExerciseStore.getState().toggleFavoriteLocal('ex-1');
      expect(useExerciseStore.getState().exercises[0]!.isFavorite).toBe(false);
    });

    it('お気に入りをfalse→trueに切り替えられる', () => {
      useExerciseStore.getState().setExercises([ex2]); // ex2はisFavorite: false
      useExerciseStore.getState().toggleFavoriteLocal('ex-2');
      expect(useExerciseStore.getState().exercises[0]!.isFavorite).toBe(true);
    });

    it('トグル対象外の種目は影響を受けない', () => {
      useExerciseStore.getState().setExercises([ex1, ex2, ex3]);
      useExerciseStore.getState().toggleFavoriteLocal('ex-1');
      expect(useExerciseStore.getState().exercises[1]!.isFavorite).toBe(false);
      expect(useExerciseStore.getState().exercises[2]!.isFavorite).toBe(false);
    });
  });

  describe('incrementInvalidation', () => {
    it('invalidationCounterが1ずつ増加する', () => {
      expect(useExerciseStore.getState().invalidationCounter).toBe(0);
      useExerciseStore.getState().incrementInvalidation();
      expect(useExerciseStore.getState().invalidationCounter).toBe(1);
      useExerciseStore.getState().incrementInvalidation();
      expect(useExerciseStore.getState().invalidationCounter).toBe(2);
    });
  });
});
