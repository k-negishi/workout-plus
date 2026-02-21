/**
 * 共通カードコンポーネント
 * 背景白、border: 1px solid #e2e8f0、border-radius: 8px、padding: 16px
 */
import React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { spacing } from '@/shared/constants/spacing';

type CardProps = {
  children: React.ReactNode;
  /** カスタムスタイル */
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
