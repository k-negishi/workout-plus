/**
 * プレースホルダー画面コンポーネント
 * 後のフェーズで実装される画面の仮表示用
 */
import React from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';
import { fontSize, fontWeight } from '@/shared/constants/typography';

type PlaceholderScreenProps = {
  /** 画面名（デバッグ用に表示） */
  name: string;
};

export function PlaceholderScreen({ name }: PlaceholderScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <Text
        style={{
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.textSecondary,
          marginTop: 8,
        }}
      >
        後のフェーズで実装
      </Text>
    </View>
  );
}
