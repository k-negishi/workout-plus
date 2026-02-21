/**
 * 空状態コンポーネント
 * データがない画面に表示するプレースホルダー
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';
import { spacing } from '@/shared/constants/spacing';
import { fontSize, fontWeight } from '@/shared/constants/typography';

import { Button } from './Button';

type EmptyStateProps = {
  /** Ionicons のアイコン名 */
  icon?: string;
  /** タイトル */
  title: string;
  /** 説明テキスト */
  description?: string;
  /** アクションボタンのラベル */
  actionLabel?: string;
  /** アクションボタンのコールバック */
  onAction?: () => void;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
      }}
    >
      {icon && (
        <View style={{ marginBottom: spacing.md }}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={48}
            color={colors.textSecondary}
          />
        </View>
      )}
      <Text
        style={{
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.lg, width: '100%' }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
