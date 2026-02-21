/**
 * v1_light カラーパレット
 * デザイントークン: プロジェクト全体で統一されたカラー定義
 */
export const colors = {
  /** メインカラー（ボタン・リンク・アクセント） */
  primary: '#4D94FF',
  /** メインカラーのダークバリエーション（ホバー・プレス時） */
  primaryDark: '#3385FF',
  /** メインカラーの薄い背景（ハイライト・選択状態） */
  primaryBg: '#E6F2FF',
  /** 本文テキスト（真っ黒 #000000 は使用禁止） */
  textPrimary: '#475569',
  /** 補助テキスト・ラベル */
  textSecondary: '#64748b',
  /** ボーダー・区切り線 */
  border: '#e2e8f0',
  /** ページ背景 */
  background: '#f9fafb',
  /** カード・モーダル背景 */
  white: '#FFFFFF',
  /** 成功・完了 */
  success: '#10B981',
  /** エラー・削除 */
  error: '#EF4444',
  /** 警告・注意 */
  warning: '#F59E0B',
} as const;

/** カラーの型 */
export type ColorKey = keyof typeof colors;
