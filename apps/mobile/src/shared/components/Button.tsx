/**
 * 共通ボタンコンポーネント
 * バリアント: primary / secondary / ghost / danger
 * サイズ: sm / md / lg
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  Text,
  type ViewStyle,
} from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { fontSize, fontWeight } from '@/shared/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  /** ボタンのテキスト */
  label: string;
  /** タップ時コールバック */
  onPress: () => void;
  /** スタイルバリアント */
  variant?: ButtonVariant;
  /** サイズ */
  size?: ButtonSize;
  /** 無効状態 */
  disabled?: boolean;
  /** ローディング表示 */
  loading?: boolean;
  /** カスタムスタイル */
  style?: StyleProp<ViewStyle>;
};

/** バリアントごとのスタイル定義 */
const variantStyles: Record<
  ButtonVariant,
  {
    bg: string;
    bgPressed: string;
    text: string;
    borderColor: string | undefined;
  }
> = {
  /** primary: 背景#4D94FF、テキスト白 */
  primary: {
    bg: colors.primary,
    bgPressed: colors.primaryDark,
    text: colors.white,
    borderColor: undefined,
  },
  /** secondary: 背景#E6F2FF、テキスト#4D94FF */
  secondary: {
    bg: colors.primaryBg,
    bgPressed: '#D6E8FF',
    text: colors.primary,
    borderColor: undefined,
  },
  /** ghost: 背景なし、テキスト#475569 */
  ghost: {
    bg: 'transparent',
    bgPressed: colors.background,
    text: colors.textPrimary,
    borderColor: undefined,
  },
  /** danger: 背景#EF4444、テキスト白 */
  danger: {
    bg: colors.error,
    bgPressed: '#DC2626',
    text: colors.white,
    borderColor: undefined,
  },
};

/** サイズごとのスタイル定義 */
const sizeStyles: Record<
  ButtonSize,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: fontSize.sm },
  md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: fontSize.md },
  lg: { paddingVertical: 16, paddingHorizontal: 20, fontSize: fontSize.md },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? vStyle.bgPressed : vStyle.bg,
          borderRadius: borderRadius.md,
          paddingVertical: sStyle.paddingVertical,
          paddingHorizontal: sStyle.paddingHorizontal,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          flexDirection: 'row' as const,
          opacity: isDisabled ? 0.5 : 1,
          borderWidth: vStyle.borderColor ? 1 : 0,
          borderColor: vStyle.borderColor,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyle.text} />
      ) : (
        <Text
          style={{
            color: vStyle.text,
            fontSize: sStyle.fontSize,
            fontWeight: fontWeight.semibold,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
