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
  /** メインカラーの中程度の背景（アイコン背景などに使用） */
  primaryBgMedium: '#CCE4FF',
  /** メインカラーのやや濃い背景（トロフィー・強調表示などに使用） */
  primaryBgStrong: '#99C9FF',
  /** メインカラーの濃い背景（チャート・深い強調表示などに使用） */
  primaryBgDeep: '#66ADFF',
  /** ニュートラルな背景（プログレスバー・デフォルト状態） */
  neutralBg: '#F1F5F9',
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
  /** タグ: 黄色背景（セット数など） */
  tagYellowBg: '#FEF3C7',
  /** タグ: 黄色テキスト（セット数など） */
  tagYellowText: '#92400E',
  /** タグ: 青背景（ボリュームなど） */
  tagBlueBg: '#DBEAFE',
  /** タグ: 青テキスト（ボリュームなど） */
  tagBlueText: '#1D4ED8',
  /** タグ: 紫背景（時間など） */
  tagPurpleBg: '#EDE9FE',
  /** タグ: 紫テキスト（時間など） */
  tagPurpleText: '#6D28D9',
} as const;

/** カラーの型 */
export type ColorKey = keyof typeof colors;
