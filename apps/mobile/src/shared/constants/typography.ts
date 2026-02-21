/**
 * タイポグラフィトークン
 * フォントサイズとウェイトの定義
 * フォントウェイトは 400/600/700 の3種のみ使用
 */
export const fontSize = {
  /** 12px - キャプション・補足テキスト */
  xs: 12,
  /** 14px - 小さめのラベル・セカンダリテキスト */
  sm: 14,
  /** 16px - 本文テキスト */
  md: 16,
  /** 18px - サブタイトル */
  lg: 18,
  /** 20px - セクションタイトル */
  xl: 20,
  /** 24px - 画面タイトル */
  xxl: 24,
} as const;

export const fontWeight = {
  /** 通常テキスト */
  normal: '400',
  /** セミボールド（ラベル・ボタン） */
  semibold: '600',
  /** ボールド（タイトル・強調） */
  bold: '700',
} as const;

/** 行間比率 */
export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 28,
  xxl: 32,
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
