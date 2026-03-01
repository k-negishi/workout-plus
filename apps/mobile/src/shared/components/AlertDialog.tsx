/**
 * アラートダイアログコンポーネント（単一OKボタン）
 * ConfirmDialog の単一ボタン版。エラー通知・情報表示などに使用する。
 * React Native Modal使用、半透明オーバーレイ（rgba(0,0,0,0.4)）
 * ダイアログカードは白背景、border-radius: 12px
 */
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { spacing } from '@/shared/constants/spacing';
import { fontSize, fontWeight } from '@/shared/constants/typography';

type AlertDialogProps = {
  /** 表示状態 */
  visible: boolean;
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** OKボタンラベル（デフォルト: 'OK'） */
  okLabel?: string;
  /** OKボタン押下時コールバック */
  onOk: () => void;
};

export function AlertDialog({ visible, title, message, okLabel = 'OK', onOk }: AlertDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* オーバーレイ背景（タップでも閉じる） */}
      <Pressable
        onPress={onOk}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ダイアログ本体（タップ伝播を止める） */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.white,
            borderRadius: borderRadius.lg,
            width: '90%',
            maxWidth: 320,
            padding: spacing.lg,
          }}
        >
          {/* タイトル + メッセージ */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: colors.textPrimary,
                textAlign: 'center',
                lineHeight: 26,
                marginBottom: spacing.sm,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 21,
              }}
            >
              {message}
            </Text>
          </View>

          {/* OKボタン（単一） */}
          <Pressable
            onPress={onOk}
            style={({ pressed }) => ({
              paddingVertical: 12,
              paddingHorizontal: spacing.md,
              backgroundColor: pressed ? colors.primaryDark : colors.primary,
              borderRadius: borderRadius.md,
              alignItems: 'center',
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: fontWeight.semibold,
                color: colors.white,
              }}
            >
              {okLabel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
