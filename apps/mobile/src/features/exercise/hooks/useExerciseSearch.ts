/**
 * 種目検索フック
 * リアルタイムフィルタリング + カテゴリフィルタ + セクション分け + ソート順
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ExerciseRepository } from '@/database/repositories/exercise';
import { useExerciseStore } from '@/stores/exerciseStore';
import type { Exercise, ExerciseSortOrder, MuscleGroup } from '@/types';

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
  /** 現在のソート順 */
  sortOrder: ExerciseSortOrder;
  /** ソート順を変更する */
  setSortOrder: (order: ExerciseSortOrder) => void;
};

/** DB行型からアプリ層型への変換（テスト容易性のためエクスポート） */
export function toExercise(row: {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string;
  is_custom: 0 | 1;
  is_favorite: 0 | 1;
  created_at: number;
  updated_at: number;
}): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment as Exercise['equipment'],
    isCustom: row.is_custom === 1,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

/** 部位グループを Map にまとめるヘルパー */
function groupByMuscle(exercises: Exercise[]): Map<MuscleGroup, Exercise[]> {
  const map = new Map<MuscleGroup, Exercise[]>();
  for (const exercise of exercises) {
    const group = map.get(exercise.muscleGroup) ?? [];
    group.push(exercise);
    map.set(exercise.muscleGroup, group);
  }
  return map;
}

/** 部位別ソート用セクション生成（muscleソートで使用） */
function buildMuscleSections(filtered: Exercise[]): ExerciseSection[] {
  const byCategory = groupByMuscle(filtered);
  return CATEGORY_ORDER.flatMap((cat) => {
    const exercises = byCategory.get(cat);
    return exercises && exercises.length > 0
      ? [{ title: `${MUSCLE_GROUP_LABELS[cat]}の種目`, data: exercises }]
      : [];
  });
}

/** 名前順ソート用セクション生成（nameソートで使用） */
function buildNameSections(filtered: Exercise[]): ExerciseSection[] {
  const favorites = filtered.filter((e) => e.isFavorite);
  const custom = filtered.filter((e) => e.isCustom && !e.isFavorite);
  const remaining = filtered.filter((e) => !e.isFavorite && !e.isCustom);
  const byCategory = groupByMuscle(remaining);

  const result: ExerciseSection[] = [];
  if (favorites.length > 0) result.push({ title: 'お気に入り', data: favorites });
  if (custom.length > 0) result.push({ title: 'マイ種目', data: custom });
  for (const cat of CATEGORY_ORDER) {
    const exercises = byCategory.get(cat);
    if (exercises && exercises.length > 0) {
      result.push({ title: `${MUSCLE_GROUP_LABELS[cat]}の種目`, data: exercises });
    }
  }
  return result;
}

/** フィルタリング処理（テキスト検索 + カテゴリフィルタ） */
function applyFilters(
  allExercises: Exercise[],
  query: string,
  selectedCategory: MuscleGroup | null,
): Exercise[] {
  let filtered = allExercises;
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter((e) => e.name.toLowerCase().includes(q));
  }
  if (selectedCategory) {
    filtered = filtered.filter((e) => e.muscleGroup === selectedCategory);
  }
  return filtered;
}

/**
 * セクション分け計算ロジック（テスト容易性のためエクスポート）
 * useMemoから切り出した純粋関数
 *
 * sortOrder ごとのセクション構造:
 * - 'name'     : お気に入り → マイ種目 → カテゴリ別（既存挙動維持）
 * - 'muscle'   : 部位グループのみ（お気に入り・マイ種目セクションなし）
 *                ※ カテゴリフィルタを無視 — 部位フィルタと部位別ソートは冗長なため
 * - 'date'     : 単一セクション（createdAt 降順のフラットリスト）
 * - 'frequency': 単一セクション（呼び出し元がDB側でソート済み、そのまま保持）
 *                ※ usage_count=0 の場合は DB 側で name ASC の自動フォールバック済み
 */
export function computeSections(
  allExercises: Exercise[],
  query: string,
  selectedCategory: MuscleGroup | null,
  sortOrder: ExerciseSortOrder = 'name',
): ExerciseSection[] {
  switch (sortOrder) {
    case 'muscle': {
      // 部位別ソート: カテゴリフィルタを無視して全種目を部位別に表示する
      // （部位フィルタと部位別ソートは冗長なため selectedCategory を null に固定）
      const filteredForMuscle = applyFilters(allExercises, query, null);
      if (filteredForMuscle.length === 0) return [];
      return buildMuscleSections(filteredForMuscle);
    }
    default: {
      // muscle 以外のソートではカテゴリフィルタを適用する
      const filtered = applyFilters(allExercises, query, selectedCategory);
      if (filtered.length === 0) return [];

      switch (sortOrder) {
        case 'date': {
          // 追加日順: createdAt 降順でフラットリスト（セクション分けなし）
          const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
          return [{ title: '', data: sorted }];
        }
        case 'frequency':
          // よく使う順: 呼び出し元（ExerciseRepository.findAllWithUsageCount）がDB側でソート済み
          // usage_count=0 のとき DB は name ASC でフォールバックするため、ここでは順序を保持するだけ
          return [{ title: '', data: filtered }];
        default:
          // 'name': お気に入り → マイ種目 → カテゴリ別（既存挙動維持）
          return buildNameSections(filtered);
      }
    }
  }
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

  // sortOrder は exerciseStore で管理（セッション内永続化のため）
  const sortOrder = useExerciseStore((s) => s.sortOrder);
  const setSortOrder = useExerciseStore((s) => s.setSortOrder);

  /**
   * 全種目を読み込む。
   *
   * 'frequency' ソート選択時は workout_exercises との JOIN クエリを使用する。
   * その他のソートは通常の findAll() を使用し、JS 側でソートする。
   */
  const loadExercises = useCallback(async () => {
    try {
      setIsLoading(true);
      if (sortOrder === 'frequency') {
        // よく使う順: DB側で usage_count を集計してソート済み
        const rows = await ExerciseRepository.findAllWithUsageCount();
        // usage_count は表示には不要なため Exercise 型に変換して捨てる
        setAllExercises(rows.map(toExercise));
      } else {
        const rows = await ExerciseRepository.findAll();
        setAllExercises(rows.map(toExercise));
      }
    } catch {
      setAllExercises([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  // sortOrder 変更時に再ロードする（frequency ↔ 他のソートで取得元が変わるため）
  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  /** フィルタリング結果をセクション分けする（純粋関数 computeSections に委譲） */
  const sections = useMemo(
    () => computeSections(allExercises, query, selectedCategory, sortOrder),
    [allExercises, query, selectedCategory, sortOrder],
  );

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    sections,
    isLoading,
    allExercises,
    sortOrder,
    setSortOrder,
  };
}

export { MUSCLE_GROUP_LABELS };
