/**
 * useExerciseSearch ロジックテスト
 * 検索・カテゴリフィルタ・セクション分けのロジックをテストする
 *
 * useExerciseSearch フックは純粋Reactフックだが、
 * @testing-library/react-native は pnpm + Jest 30 + Expo 54 環境での
 * ESM互換性問題があるため、エクスポートされた純粋関数 computeSections を直接テストする。
 * （useExerciseHistory.test.ts と同じアプローチ）
 */
import type { Exercise, MuscleGroup } from '@/types';

import { computeSections, toExercise } from '../useExerciseSearch';

/** テスト用の種目データ生成ヘルパー */
function makeExercise(overrides: Partial<Exercise> & { id: string; name: string; muscleGroup: MuscleGroup }): Exercise {
  const now = Date.now();
  return {
    equipment: 'barbell',
    isCustom: false,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** テスト用のデータセット */
const testExercises: Exercise[] = [
  makeExercise({ id: 'ex-1', name: 'ベンチプレス', muscleGroup: 'chest', isFavorite: true }),
  makeExercise({ id: 'ex-2', name: 'インクラインダンベルプレス', muscleGroup: 'chest', equipment: 'dumbbell' }),
  makeExercise({ id: 'ex-3', name: 'デッドリフト', muscleGroup: 'back' }),
  makeExercise({ id: 'ex-4', name: 'ラットプルダウン', muscleGroup: 'back', equipment: 'cable' }),
  makeExercise({ id: 'ex-5', name: 'スクワット', muscleGroup: 'legs', isFavorite: true }),
  makeExercise({ id: 'ex-6', name: 'カスタム種目', muscleGroup: 'shoulders', isCustom: true }),
  makeExercise({ id: 'ex-7', name: 'バーベルカール', muscleGroup: 'biceps' }),
];

describe('toExercise: DBの行からExerciseへの変換', () => {
  it('DB行をExercise型に正しく変換する', () => {
    const now = Date.now();
    const row = {
      id: 'ex-1',
      name: 'ベンチプレス',
      muscle_group: 'chest' as MuscleGroup,
      equipment: 'barbell',
      is_custom: 0 as 0 | 1,
      is_favorite: 1 as 0 | 1,
      created_at: now,
      updated_at: now,
    };
    const exercise = toExercise(row);
    expect(exercise.id).toBe('ex-1');
    expect(exercise.name).toBe('ベンチプレス');
    expect(exercise.muscleGroup).toBe('chest');
    expect(exercise.equipment).toBe('barbell');
    expect(exercise.isCustom).toBe(false);  // is_custom === 0 → false
    expect(exercise.isFavorite).toBe(true); // is_favorite === 1 → true
    expect(exercise.createdAt).toBe(now);
  });

  it('is_custom=1, is_favorite=0のカスタム種目を正しく変換する', () => {
    const now = Date.now();
    const row = {
      id: 'ex-custom',
      name: 'マイ種目',
      muscle_group: 'back' as MuscleGroup,
      equipment: 'bodyweight',
      is_custom: 1 as 0 | 1,
      is_favorite: 0 as 0 | 1,
      created_at: now,
      updated_at: now,
    };
    const exercise = toExercise(row);
    expect(exercise.isCustom).toBe(true);
    expect(exercise.isFavorite).toBe(false);
  });
});

describe('useExerciseSearch セクション計算ロジック', () => {
  describe('初期状態（検索なし・カテゴリなし）', () => {
    it('お気に入り種目が「お気に入り」セクションに分類される', () => {
      const sections = computeSections(testExercises, '', null);
      const favSection = sections.find((s) => s.title === 'お気に入り');
      expect(favSection).toBeDefined();
      expect(favSection!.data).toHaveLength(2); // ベンチプレス、スクワット
      expect(favSection!.data.map((e) => e.name)).toContain('ベンチプレス');
      expect(favSection!.data.map((e) => e.name)).toContain('スクワット');
    });

    it('カスタム種目が「マイ種目」セクションに分類される', () => {
      const sections = computeSections(testExercises, '', null);
      const customSection = sections.find((s) => s.title === 'マイ種目');
      expect(customSection).toBeDefined();
      expect(customSection!.data).toHaveLength(1);
      expect(customSection!.data[0]!.name).toBe('カスタム種目');
    });

    it('お気に入りセクションが最初に来る', () => {
      const sections = computeSections(testExercises, '', null);
      expect(sections[0]!.title).toBe('お気に入り');
    });

    it('残りの種目がカテゴリ別セクションに分類される', () => {
      const sections = computeSections(testExercises, '', null);

      // お気に入りでもカスタムでもない胸の種目: インクラインダンベルプレスのみ
      const chestSection = sections.find((s) => s.title === '胸の種目');
      expect(chestSection).toBeDefined();
      expect(chestSection!.data).toHaveLength(1);
      expect(chestSection!.data[0]!.name).toBe('インクラインダンベルプレス');

      // 背中の種目: デッドリフト、ラットプルダウン
      const backSection = sections.find((s) => s.title === '背中の種目');
      expect(backSection).toBeDefined();
      expect(backSection!.data).toHaveLength(2);
    });

    it('データなしでは空配列を返す', () => {
      const sections = computeSections([], '', null);
      expect(sections).toHaveLength(0);
    });
  });

  describe('テキスト検索', () => {
    it('名前の部分一致でフィルタリングできる', () => {
      const sections = computeSections(testExercises, 'ベンチ', null);
      const allFiltered = sections.flatMap((s) => s.data);
      expect(allFiltered).toHaveLength(1);
      expect(allFiltered[0]!.name).toBe('ベンチプレス');
    });

    it('空文字列の検索では全件が返る', () => {
      const sections = computeSections(testExercises, '', null);
      const allFiltered = sections.flatMap((s) => s.data);
      expect(allFiltered).toHaveLength(7);
    });

    it('空白のみの検索でも全件が返る', () => {
      const sections = computeSections(testExercises, '   ', null);
      const allFiltered = sections.flatMap((s) => s.data);
      expect(allFiltered).toHaveLength(7);
    });

    it('該当なしの検索では空になる', () => {
      const sections = computeSections(testExercises, '存在しない種目', null);
      expect(sections).toHaveLength(0);
    });

    it('大文字小文字を区別しない検索ができる', () => {
      const sections = computeSections(testExercises, 'カール', null);
      const allFiltered = sections.flatMap((s) => s.data);
      expect(allFiltered).toHaveLength(1);
      expect(allFiltered[0]!.name).toBe('バーベルカール');
    });
  });

  describe('カテゴリフィルタ', () => {
    it('部位カテゴリでフィルタリングできる', () => {
      const sections = computeSections(testExercises, '', 'chest');
      const allFiltered = sections.flatMap((s) => s.data);
      // chest: ベンチプレス（お気に入り）、インクラインダンベルプレス
      expect(allFiltered).toHaveLength(2);
      expect(allFiltered.every((e) => e.muscleGroup === 'chest')).toBe(true);
    });

    it('カテゴリをnullにすると全部位が返る', () => {
      const sections = computeSections(testExercises, '', null);
      const allFiltered = sections.flatMap((s) => s.data);
      expect(allFiltered).toHaveLength(7);
    });

    it('存在しない部位のカテゴリでは空になる（腹筋は testExercises にない）', () => {
      const sections = computeSections(testExercises, '', 'abs');
      expect(sections).toHaveLength(0);
    });
  });

  describe('テキスト検索 + カテゴリの組み合わせ', () => {
    it('テキスト検索とカテゴリフィルタを同時に適用できる', () => {
      const sections = computeSections(testExercises, 'プレス', 'chest');
      const allFiltered = sections.flatMap((s) => s.data);
      // chest + "プレス": ベンチプレス、インクラインダンベルプレス
      expect(allFiltered).toHaveLength(2);
      expect(allFiltered.every((e) => e.name.includes('プレス'))).toBe(true);
      expect(allFiltered.every((e) => e.muscleGroup === 'chest')).toBe(true);
    });

    it('組み合わせで絞り込み結果がゼロになる場合も空配列を返す', () => {
      const sections = computeSections(testExercises, 'デッドリフト', 'chest');
      expect(sections.flatMap((s) => s.data)).toHaveLength(0);
    });
  });

  describe('セクション順序', () => {
    it('カテゴリセクションは chest → back → biceps 順で並ぶ', () => {
      // testExercises: chest=インクライン, back=デッドリフト+ラット, biceps=バーベルカール
      // (shoulders=カスタム種目→マイ種目、legs=スクワット→お気に入り のためカテゴリセクションに出ない)
      const sections = computeSections(testExercises, '', null);
      const categorySections = sections.filter(
        (s) => s.title !== 'お気に入り' && s.title !== 'マイ種目'
      );
      const chestIdx = categorySections.findIndex((s) => s.title === '胸の種目');
      const backIdx = categorySections.findIndex((s) => s.title === '背中の種目');
      const bicepsIdx = categorySections.findIndex((s) => s.title === '二頭の種目');

      expect(chestIdx).toBeGreaterThanOrEqual(0);
      expect(backIdx).toBeGreaterThanOrEqual(0);
      expect(bicepsIdx).toBeGreaterThanOrEqual(0);
      expect(chestIdx).toBeLessThan(backIdx);
      expect(backIdx).toBeLessThan(bicepsIdx);
    });

    it('空のカテゴリセクションは表示されない', () => {
      // testExercises には腹筋(abs)がない
      const sections = computeSections(testExercises, '', null);
      const sectionTitles = sections.map((s) => s.title);
      expect(sectionTitles).not.toContain('腹の種目');
    });
  });
});
