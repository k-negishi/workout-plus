/**
 * タイポグラフィトークン
 * フォントサイズとウェイトの定義
 * フォントウェイトは 400/600/700 の3種のみ使用
 */
export const fontSize = {
  /** 14px - キャプション・補足テキスト（Issue #118: 12→14） */
  xs: 14,
  /** 16px - 小さめのラベル・セカンダリテキスト（Issue #118: 14→16） */
  sm: 16,
  /** 18px - 本文テキスト（Issue #118: 16→18） */
  md: 18,
  /** 20px - サブタイトル（Issue #118: 18→20） */
  lg: 20,
  /** 22px - セクションタイトル（Issue #118: 20→22） */
  xl: 22,
  /** 26px - 画面タイトル（Issue #118: 24→26） */
  xxl: 26,
} as const;

export const fontWeight = {
  /** 通常テキスト */
  normal: '400',
  /** セミボールド（ラベル・ボタン） */
  semibold: '600',
  /** ボールド（タイトル・強調） */
  bold: '700',
} as const;

/** 行間比率（Issue #118: フォントサイズ拡大に合わせて調整） */
export const lineHeight = {
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 32,
  xxl: 36,
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
