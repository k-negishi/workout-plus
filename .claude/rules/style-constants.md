# スタイル定数管理ルール

## 概要

フォントサイズ・カラーコードは `@/shared/constants` に定義された定数を使用すること。
NativeWind はレイアウトユーティリティのみに限定し、色・フォントサイズの任意値は禁止。

## 禁止パターン

```typescript
// NG: カラーの直書き
style={{ color: '#475569' }}
style={{ backgroundColor: '#E6FAF1' }}

// NG: フォントサイズの直書き
style={{ fontSize: 16 }}

// NG: NativeWind 任意値（フォントサイズ）
className="text-[14px]"
className="text-[17px]"

// NG: NativeWind 任意値（カラー）
className="text-[#475569]"
className="bg-[#E6FAF1]"
```

## OKパターン

```typescript
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/shared/constants';

// OK: 定数参照
style={{ color: colors.textPrimary }}
style={{ backgroundColor: colors.successBg }}
style={{ fontSize: fontSize.sm }}
style={{ fontWeight: fontWeight.semibold }}
style={{ padding: spacing.md }}
style={{ borderRadius: borderRadius.md }}

// OK: NativeWind レイアウトユーティリティ
className="flex-1 items-center justify-between"
className="px-4 py-2"
className="flex-row gap-2"
```

## カラートークン一覧

| トークン | 値 | 用途 |
|---|---|---|
| `colors.primary` | `#4D94FF` | ボタン・リンク・アクセント |
| `colors.primaryDark` | `#3385FF` | ホバー・プレス時 |
| `colors.primaryBg` | `#E6F2FF` | ハイライト・選択状態背景 |
| `colors.textPrimary` | `#475569` | 本文テキスト |
| `colors.textSecondary` | `#64748b` | 補助テキスト・ラベル |
| `colors.textTertiary` | `#334155` | 入力値・強調テキスト |
| `colors.inputBg` | `#FAFBFC` | 入力フィールド背景 |
| `colors.successBg` | `#E6FAF1` | 成功/追加済みバッジ背景 |
| `colors.badgeBlueBg` | `#cce5ff` | 汎用バッジ青背景 |
| `colors.border` | `#e2e8f0` | ボーダー・区切り線 |
| `colors.background` | `#f9fafb` | ページ背景 |
| `colors.success` | `#10B981` | 成功・完了 |
| `colors.error` | `#EF4444` | エラー・削除 |
| `colors.white` | `#FFFFFF` | カード・モーダル背景 |

## フォントサイズトークン一覧

| トークン | 値 | 用途 |
|---|---|---|
| `fontSize.xs` | `14px` | キャプション・補足テキスト |
| `fontSize.sm` | `16px` | ラベル・セカンダリテキスト |
| `fontSize.md` | `18px` | 本文テキスト |
| `fontSize.lg` | `20px` | サブタイトル |
| `fontSize.xl` | `22px` | セクションタイトル |
| `fontSize.xxl` | `26px` | 画面タイトル |
| `fontSize.xxxl` | `34px` | StreakCard 等の大数字 |

## 非標準サイズの扱い

11px, 12px, 13px, 15px, 17px 等 constants に定義されていないサイズは:
- インラインスタイルで数値そのまま維持（`style={{ fontSize: 13 }}`）
- 無理に近似値トークンに置換しない（デザインが変わるため）
- 将来的にトークン追加を検討する場合は仕様を確認してから追加
