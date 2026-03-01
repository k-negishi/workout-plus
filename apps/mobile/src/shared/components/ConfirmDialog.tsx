/**
 * 確認ダイアログコンポーネント
 * React Native Modal使用、半透明オーバーレイ（rgba(0,0,0,0.4)）
 * ダイアログカードは白背景、border-radius: 12px
 */
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { spacing } from '@/shared/constants/spacing';
import { fontSize, fontWeight } from '@/shared/constants/typography';

type ConfirmDialogProps = {
  /** 表示状態 */
  visible: boolean;
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** 確認ボタンラベル（デフォルト: '確認'） */
  confirmLabel?: string;
  /** キャンセルボタンラベル（デフォルト: 'キャンセル'） */
  cancelLabel?: string;
  /** 確認ボタンのスタイル */
  confirmStyle?: 'default' | 'destructive';
  /** 破壊的操作フラグ（confirmStyle="destructive"と同義） */
  destructive?: boolean;
  /** 確認時コールバック */
  onConfirm: () => void;
  /** キャンセル時コールバック */
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  confirmStyle = 'default',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // destructive propsまたはconfirmStyle="destructive"どちらでも赤ボタンを表示する
  const isDestructive = destructive || confirmStyle === 'destructive';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* オーバーレイ背景 */}
      <Pressable
        onPress={onCancel}
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

          {/* アクションボタン */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {/* キャンセルボタン */}
            {/* NativeWind v4: Pressable の style 関数は実機で無視されるため TouchableOpacity に変更 */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: fontWeight.semibold,
                  color: colors.textPrimary,
                }}
              >
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            {/* 確認ボタン */}
            {/* NativeWind v4: Pressable の style 関数は実機で無視されるため TouchableOpacity に変更 */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onConfirm}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                backgroundColor: isDestructive ? colors.error : colors.primary,
                borderRadius: borderRadius.md,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: fontWeight.semibold,
                  color: colors.white,
                }}
              >
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
