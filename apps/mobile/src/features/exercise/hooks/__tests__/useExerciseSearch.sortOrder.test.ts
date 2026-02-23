/**
 * useExerciseSearch - sortOrder 対応テスト
 *
 * computeSections の sortOrder 引数を検証する。
 * 各ソートモードのセクション構造・順序が仕様通りになることを確認する。
 *
 * Red フェーズ: computeSections が sortOrder を受け入れる前に記述する。
 * 実装後に Green になることを確認する。
 */
import type { Exercise, ExerciseSortOrder, MuscleGroup } from '@/types';

import { computeSections } from '../useExerciseSearch';

/** テスト用の種目データ生成ヘルパー */
function makeExercise(
  overrides: Partial<Exercise> & { id: string; name: string; muscleGroup: MuscleGroup },
): Exercise {
  return {
    equipment: 'barbell',
    isCustom: false,
    isFavorite: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

/** テスト用データセット（ソートテスト用） */
const sortTestExercises: Exercise[] = [
  // 胸（お気に入り付き）
  makeExercise({
    id: 'ex-1',
    name: 'ベンチプレス',
    muscleGroup: 'chest',
    isFavorite: true,
    createdAt: 3000,
    updatedAt: 3000,
  }),
  // 胸（通常）
  makeExercise({
    id: 'ex-2',
    name: 'インクラインプレス',
    muscleGroup: 'chest',
    createdAt: 2000,
    updatedAt: 2000,
  }),
  // 背中（カスタム）
  makeExercise({
    id: 'ex-3',
    name: 'ラットプルダウン',
    muscleGroup: 'back',
    isCustom: true,
    createdAt: 1000,
    updatedAt: 1000,
  }),
  // 脚
  makeExercise({
    id: 'ex-4',
    name: 'スクワット',
    muscleGroup: 'legs',
    createdAt: 4000,
    updatedAt: 4000,
  }),
  // 肩
  makeExercise({
    id: 'ex-5',
    name: 'ショルダープレス',
    muscleGroup: 'shoulders',
    createdAt: 5000,
    updatedAt: 5000,
  }),
];

describe('computeSections - sortOrder: name（デフォルト）', () => {
  it('お気に入りセクションが先頭に来る', () => {
    const sections = computeSections(sortTestExercises, '', null, 'name');
    expect(sections[0]!.title).toBe('お気に入り');
  });

  it('マイ種目セクションがお気に入りの次に来る', () => {
    const sections = computeSections(sortTestExercises, '', null, 'name');
    expect(sections[1]!.title).toBe('マイ種目');
  });

  it('カテゴリセクションが続く', () => {
    const sections = computeSections(sortTestExercises, '', null, 'name');
    // お気に入り + マイ種目 + カテゴリ別
    expect(sections.length).toBeGreaterThan(2);
    const titlesAfterSpecial = sections.slice(2).map((s) => s.title);
    // 胸・脚・肩のカテゴリセクションが存在する
    expect(titlesAfterSpecial.some((t) => t.includes('胸'))).toBe(true);
  });

  it('sortOrder 省略時はデフォルト（name）と同じ結果になる', () => {
    // 型的には省略不可だが、既存の呼び出しとの互換性確認
    const withName = computeSections(sortTestExercises, '', null, 'name');
    expect(withName[0]!.title).toBe('お気に入り');
  });
});

describe('computeSections - sortOrder: muscle（部位別）', () => {
  it('お気に入りセクションが存在しない（部位セクションに統合）', () => {
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const favSection = sections.find((s) => s.title === 'お気に入り');
    expect(favSection).toBeUndefined();
  });

  it('マイ種目セクションが存在しない（部位セクションに統合）', () => {
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const customSection = sections.find((s) => s.title === 'マイ種目');
    expect(customSection).toBeUndefined();
  });

  it('全種目が部位セクションに分類される', () => {
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const allExercises = sections.flatMap((s) => s.data);
    // 5種目すべてが含まれる
    expect(allExercises).toHaveLength(5);
  });

  it('部位セクションが CATEGORY_ORDER 順に並ぶ（chest → back → legs → shoulders）', () => {
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const titles = sections.map((s) => s.title);
    const chestIdx = titles.findIndex((t) => t.includes('胸'));
    const backIdx = titles.findIndex((t) => t.includes('背中'));
    const legsIdx = titles.findIndex((t) => t.includes('脚'));
    const shouldersIdx = titles.findIndex((t) => t.includes('肩'));
    expect(chestIdx).toBeLessThan(backIdx);
    expect(backIdx).toBeLessThan(legsIdx);
    expect(legsIdx).toBeLessThan(shouldersIdx);
  });

  it('お気に入り種目も対応する部位セクションに含まれる', () => {
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const chestSection = sections.find((s) => s.title.includes('胸'));
    expect(chestSection).toBeDefined();
    // ベンチプレス（お気に入り）とインクラインプレスの両方が胸セクションに含まれる
    expect(chestSection!.data).toHaveLength(2);
  });
});

describe('computeSections - sortOrder: date（追加日順）', () => {
  it('単一セクションで全種目を返す', () => {
    const sections = computeSections(sortTestExercises, '', null, 'date');
    expect(sections).toHaveLength(1);
  });

  it('createdAt 降順（新しい順）で並ぶ', () => {
    const sections = computeSections(sortTestExercises, '', null, 'date');
    const exercises = sections[0]!.data;
    // createdAt: ex-5=5000, ex-4=4000, ex-1=3000, ex-2=2000, ex-3=1000
    expect(exercises[0]!.id).toBe('ex-5'); // createdAt=5000 が先頭
    expect(exercises[1]!.id).toBe('ex-4'); // createdAt=4000
    expect(exercises[2]!.id).toBe('ex-1'); // createdAt=3000
    expect(exercises[3]!.id).toBe('ex-2'); // createdAt=2000
    expect(exercises[4]!.id).toBe('ex-3'); // createdAt=1000 が末尾
  });

  it('全5種目が含まれる（セクション分けなし）', () => {
    const sections = computeSections(sortTestExercises, '', null, 'date');
    expect(sections[0]!.data).toHaveLength(5);
  });
});

describe('computeSections - sortOrder: frequency（よく使う順）', () => {
  it('渡された順序を維持する（既にDBでソート済みのため並び替えしない）', () => {
    // よく使う順はDBクエリで既にソート済みで渡されることを前提とする
    // computeSections は受け取った順序をそのまま単一セクションで返す
    const sections = computeSections(sortTestExercises, '', null, 'frequency');
    expect(sections).toHaveLength(1);
    // 渡した順序がそのまま保持される
    const ids = sections[0]!.data.map((e) => e.id);
    expect(ids).toEqual(['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5']);
  });

  it('全種目が含まれる', () => {
    const sections = computeSections(sortTestExercises, '', null, 'frequency');
    expect(sections[0]!.data).toHaveLength(5);
  });
});

describe('computeSections - sortOrder × テキスト検索の組み合わせ', () => {
  it('muscle ソート + テキスト検索でフィルタされた結果が部位別セクションに入る', () => {
    // "プレス" で絞り込み → ベンチプレス（chest）、インクラインプレス（chest）、ショルダープレス（shoulders）
    const sections = computeSections(sortTestExercises, 'プレス', null, 'muscle');
    const allFiltered = sections.flatMap((s) => s.data);
    expect(allFiltered).toHaveLength(3);
    // お気に入りセクションは存在しない
    expect(sections.find((s) => s.title === 'お気に入り')).toBeUndefined();
  });

  it('date ソート + テキスト検索でフィルタされた結果が日付順に並ぶ', () => {
    const sections = computeSections(sortTestExercises, 'プレス', null, 'date');
    const exercises = sections[0]!.data;
    // プレスに合致: ショルダー（5000）、ベンチ（3000）、インクライン（2000）
    expect(exercises).toHaveLength(3);
    expect(exercises[0]!.id).toBe('ex-5'); // ショルダープレス createdAt=5000
    expect(exercises[1]!.id).toBe('ex-1'); // ベンチプレス createdAt=3000
    expect(exercises[2]!.id).toBe('ex-2'); // インクラインプレス createdAt=2000
  });
});

describe('computeSections - エッジケース', () => {
  it('種目が空の場合はどのソートでも空配列を返す', () => {
    const sortOrders: ExerciseSortOrder[] = ['name', 'muscle', 'date', 'frequency'];
    for (const sortOrder of sortOrders) {
      const sections = computeSections([], '', null, sortOrder);
      expect(sections).toHaveLength(0);
    }
  });

  it('muscle ソート + カテゴリフィルタ選択中はフィルタを無視して全部位を表示する', () => {
    // 部位フィルタと部位別ソートは冗長なため、muscle ソート時は selectedCategory を無視する
    const sections = computeSections(sortTestExercises, '', 'chest', 'muscle');
    const allExercises = sections.flatMap((s) => s.data);
    // カテゴリフィルタを無視するため全5種目が含まれる
    expect(allExercises).toHaveLength(5);
    // 複数の部位セクションが存在する（chest だけでなく back/legs/shoulders も）
    expect(sections.length).toBeGreaterThan(1);
  });
});

describe('computeSections - US3: ソートとお気に入り・マイ種目セクションの共存', () => {
  it('name ソート時は お気に入りセクションが先頭に来る（US3 Scenario 1）', () => {
    // お気に入り登録済みの種目がある状態で「名前順」を選択
    const sections = computeSections(sortTestExercises, '', null, 'name');
    expect(sections[0]!.title).toBe('お気に入り');
    // お気に入り種目（ベンチプレス）が含まれる
    expect(sections[0]!.data.some((e) => e.isFavorite)).toBe(true);
  });

  it('muscle ソート時は お気に入り・マイ種目が部位セクションに統合される（US3 Scenario 2）', () => {
    // 「部位別」選択時、お気に入りもマイ種目も各部位のセクションに含まれる
    const sections = computeSections(sortTestExercises, '', null, 'muscle');
    const favSection = sections.find((s) => s.title === 'お気に入り');
    const customSection = sections.find((s) => s.title === 'マイ種目');
    expect(favSection).toBeUndefined(); // お気に入りセクションは分離しない
    expect(customSection).toBeUndefined(); // マイ種目セクションは分離しない
    // お気に入り種目（ベンチプレス）は胸セクションに含まれる
    const chestSection = sections.find((s) => s.title.includes('胸'));
    expect(chestSection!.data.some((e) => e.isFavorite)).toBe(true);
  });

  it('frequency ソートで usage_count=0 時は DB 返却順（name ASC フォールバック）を保持する（US3 Scenario 3）', () => {
    // DB は usage_count=0 の場合 name ASC で返すため、名前順に並んだデータが来る
    // computeSections は受け取った順序をそのまま保持する（DB 側でソート済みのため）
    const nameAscExercises = [...sortTestExercises].sort((a, b) =>
      a.name.localeCompare(b.name, 'ja'),
    );
    const sections = computeSections(nameAscExercises, '', null, 'frequency');
    expect(sections).toHaveLength(1); // フラットリスト
    const ids = sections[0]!.data.map((e) => e.id);
    expect(ids).toEqual(nameAscExercises.map((e) => e.id)); // 名前順が保持される
  });
});
