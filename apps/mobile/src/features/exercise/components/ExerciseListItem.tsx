/**
 * T037: ExerciseListItem
 * 種目一覧の1行コンポーネント
 * 種目名、部位バッジ、器具バッジ、お気に入りトグルを表示
 * single/multi モードに対応
 */
import React, { useCallback } from 'react';
import { type ViewStyle, Pressable, Text, View } from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { fontSize, fontWeight } from '@/shared/constants/typography';
import type { Exercise } from '@/types';

/** 部位の日本語ラベル */
const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  biceps: '二頭筋',
  triceps: '三頭筋',
  abs: '腹筋',
};

/** 器具の日本語ラベル */
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'バーベル',
  dumbbell: 'ダンベル',
  machine: 'マシン',
  cable: 'ケーブル',
  bodyweight: '自重',
};

/** リストアイテムのベーススタイルを計算する純粋関数（複雑な条件分岐をコンポーネント外に分離） */
function getListItemStyle(isSelected: boolean, pressed: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: isSelected ? colors.primaryBg : pressed ? colors.background : colors.white,
    borderLeftWidth: isSelected ? 3 : 0,
    borderLeftColor: isSelected ? colors.primary : 'transparent',
  };
}

type ExerciseListItemProps = {
  /** 種目データ */
  exercise: Exercise;
  /** 選択モード */
  mode: 'single' | 'multi';
  /** multi モード時の選択状態 */
  isSelected?: boolean;
  /** タップ時コールバック（選択） */
  onPress: (exercise: Exercise) => void;
  /** お気に入りトグルコールバック */
  onToggleFavorite: (exerciseId: string) => void;
};

export function ExerciseListItem({
  exercise,
  mode,
  isSelected = false,
  onPress,
  onToggleFavorite,
}: ExerciseListItemProps) {
  const handlePress = useCallback(() => {
    onPress(exercise);
  }, [exercise, onPress]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(exercise.id);
  }, [exercise.id, onToggleFavorite]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => getListItemStyle(isSelected, pressed)}
    >
      {/* multi モード時のチェックボックス */}
      {mode === 'multi' && (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: borderRadius.md,
            borderWidth: 2,
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.primary : colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && (
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: fontWeight.bold }}>
              ✓
            </Text>
          )}
        </View>
      )}

      {/* 種目情報 */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textPrimary,
            }}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {/* 部位バッジ */}
          <View
            style={{
              paddingVertical: 2,
              paddingHorizontal: 8,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primaryBg,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: fontWeight.semibold,
                color: colors.primaryDark,
              }}
            >
              {MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup}
            </Text>
          </View>
          {/* 器具バッジ */}
          <View
            style={{
              paddingVertical: 2,
              paddingHorizontal: 8,
              borderRadius: borderRadius.md,
              backgroundColor: '#F1F3F5',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: fontWeight.normal,
                color: colors.textSecondary,
              }}
            >
              {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
            </Text>
          </View>
        </View>
      </View>

      {/* お気に入りボタン */}
      <Pressable
        onPress={handleToggleFavorite}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: exercise.isFavorite ? '#F59E0B' : colors.textSecondary,
            opacity: exercise.isFavorite ? 1 : 0.5,
          }}
        >
          {exercise.isFavorite ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
}
