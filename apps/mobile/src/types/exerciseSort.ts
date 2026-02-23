/**
 * 種目選択画面のソート順種別
 */
export type ExerciseSortOrder =
  | 'name' // 名前順（デフォルト）
  | 'muscle' // 部位別
  | 'date' // 追加日順（新しい順）
  | 'frequency'; // よく使う順
