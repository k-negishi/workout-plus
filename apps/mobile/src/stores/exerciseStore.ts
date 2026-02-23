/**
 * 種目ストア（Zustand）
 * 種目リストのキャッシュとお気に入り状態を管理
 */
import { create } from 'zustand';

import type { Exercise, ExerciseSortOrder } from '@/types';

type ExerciseStoreState = {
  /** 種目リスト */
  exercises: Exercise[];
  /** UI再描画トリガー用カウンター */
  invalidationCounter: number;
  /** 種目選択画面のソート順（セッション内保持） */
  sortOrder: ExerciseSortOrder;

  // === アクション ===
  /** 種目リストを一括セット */
  setExercises: (exercises: Exercise[]) => void;
  /** 種目を追加 */
  addExercise: (exercise: Exercise) => void;
  /** 種目を部分更新 */
  updateExercise: (id: string, updates: Partial<Exercise>) => void;
  /** お気に入りをローカルでトグル（楽観的更新用） */
  toggleFavoriteLocal: (id: string) => void;
  /** invalidationカウンターをインクリメント */
  incrementInvalidation: () => void;
  /** ソート順を変更する */
  setSortOrder: (order: ExerciseSortOrder) => void;
};

export const useExerciseStore = create<ExerciseStoreState>((set) => ({
  exercises: [],
  invalidationCounter: 0,
  sortOrder: 'name',

  setExercises: (exercises) => set({ exercises }),

  addExercise: (exercise) =>
    set((state) => ({
      exercises: [...state.exercises, exercise],
    })),

  updateExercise: (id, updates) =>
    set((state) => ({
      exercises: state.exercises.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  toggleFavoriteLocal: (id) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.id === id ? { ...e, isFavorite: !e.isFavorite } : e,
      ),
    })),

  incrementInvalidation: () =>
    set((state) => ({
      invalidationCounter: state.invalidationCounter + 1,
    })),

  setSortOrder: (order) => set({ sortOrder: order }),
}));
