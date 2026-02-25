/**
 * 種目検索フック
 * リアルタイムフィルタリング + カテゴリフィルタ + セクション分け
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ExerciseRepository } from '@/database/repositories/exercise';
import type { Exercise, MuscleGroup } from '@/types';

/** セクション区分 */
export type ExerciseSection = {
  title: string;
  data: Exercise[];
};

/** フックの戻り値型 */
export type UseExerciseSearchReturn = {
  /** テキスト検索クエリ */
  query: string;
  /** 検索クエリを更新する */
  setQuery: (q: string) => void;
  /** 選択中のカテゴリ（nullは全部位） */
  selectedCategory: MuscleGroup | null;
  /** カテゴリを切り替える */
  setSelectedCategory: (cat: MuscleGroup | null) => void;
  /** セクション分けされた種目リスト */
  sections: ExerciseSection[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 種目の全リスト（フィルタリングなし） */
  allExercises: Exercise[];
  /** 全種目を再読み込みする（並び替え保存後などに呼ぶ） */
  loadExercises: () => Promise<void>;
};

/** DB行型からアプリ層型への変換（テスト容易性のためエクスポート） */
export function toExercise(row: {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string;
  is_custom: 0 | 1;
  is_favorite: 0 | 1;
  is_deleted: 0 | 1;
  created_at: number;
  updated_at: number;
  sort_order: number;
}): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment as Exercise['equipment'],
    isCustom: row.is_custom === 1,
    isFavorite: row.is_favorite === 1,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
  };
}

/** 部位の日本語ラベル */
const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  biceps: '二頭',
  triceps: '三頭',
  abs: '腹',
};

/** カテゴリ順序 */
const CATEGORY_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
];

/**
 * セクション分け計算ロジック（テスト容易性のためエクスポート）
 * useMemoから切り出した純粋関数
 */
export function computeSections(
  allExercises: Exercise[],
  query: string,
  selectedCategory: MuscleGroup | null,
): ExerciseSection[] {
  // テキスト検索でフィルタ
  let filtered = allExercises;
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter((e) => e.name.toLowerCase().includes(q));
  }

  // カテゴリフィルタ
  if (selectedCategory) {
    filtered = filtered.filter((e) => e.muscleGroup === selectedCategory);
  }

  // お気に入りセクション
  const favorites = filtered.filter((e) => e.isFavorite);

  // マイ種目セクション（カスタム作成かつお気に入り以外）
  const custom = filtered.filter((e) => e.isCustom && !e.isFavorite);

  // カテゴリ別（お気に入り・マイ種目以外）
  const remaining = filtered.filter((e) => !e.isFavorite && !e.isCustom);

  // カテゴリでグルーピング
  const byCategory = new Map<MuscleGroup, Exercise[]>();
  for (const exercise of remaining) {
    const group = byCategory.get(exercise.muscleGroup) ?? [];
    group.push(exercise);
    byCategory.set(exercise.muscleGroup, group);
  }

  const result: ExerciseSection[] = [];

  if (favorites.length > 0) {
    result.push({ title: 'お気に入り', data: favorites });
  }

  if (custom.length > 0) {
    result.push({ title: 'マイ種目', data: custom });
  }

  for (const cat of CATEGORY_ORDER) {
    const exercises = byCategory.get(cat);
    if (exercises && exercises.length > 0) {
      result.push({
        title: `${MUSCLE_GROUP_LABELS[cat]}の種目`,
        data: exercises,
      });
    }
  }

  return result;
}

/**
 * 種目検索を管理するカスタムフック
 * @ignore React hook本体はrenderHookが必要。純粋関数（computeSections/toExercise）はカバー済み
 */
/* istanbul ignore next */
export function useExerciseSearch(): UseExerciseSearchReturn {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** 全種目を読み込む */
  const loadExercises = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await ExerciseRepository.findAll();
      setAllExercises(rows.map(toExercise));
    } catch {
      setAllExercises([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  /** フィルタリング結果をセクション分けする（純粋関数 computeSections に委譲） */
  const sections = useMemo(
    () => computeSections(allExercises, query, selectedCategory),
    [allExercises, query, selectedCategory],
  );

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    sections,
    isLoading,
    allExercises,
    loadExercises,
  };
}

export { MUSCLE_GROUP_LABELS };
