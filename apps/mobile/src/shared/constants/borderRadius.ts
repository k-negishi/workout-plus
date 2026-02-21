/**
 * ボーダーラジウストークン
 * 3種類のみ使用（6px / 8px / 12px）
 */
export const borderRadius = {
  /** 6px - 小さな要素（チップ・バッジ） */
  sm: 6,
  /** 8px - 標準要素（ボタン・入力フィールド） */
  md: 8,
  /** 12px - 大きな要素（カード・モーダル） */
  lg: 12,
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;
