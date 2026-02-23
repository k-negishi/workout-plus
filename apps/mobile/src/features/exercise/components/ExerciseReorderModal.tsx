/**
 * ExerciseReorderModal
 * 種目の並び順をドラッグ＆ドロップで変更するフルスクリーンモーダル
 *
 * - DraggableFlatList で全種目をロングプレス→ドラッグで並び替える
 * - 「保存する」で onSave に並び替え後の配列を渡す
 * - 「キャンセル」で変更を破棄して onClose を呼ぶ
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type ExerciseReorderModalProps = {
  /** モーダルの表示状態 */
  visible: boolean;
  /** 並び替え対象の種目一覧（表示順序通りに渡す） */
  exercises: Exercise[];
  /** 「保存する」タップ時に並び替え後の配列を渡す */
  onSave: (ordered: Exercise[]) => void;
  /** 「キャンセル」タップ時（変更を破棄して閉じる） */
  onClose: () => void;
};

/**
 * ドラッグ中の行の背景色を返す
 * isActive=true のときハイライト、通常時は白背景
 */
function getRowBackgroundColor(isActive: boolean): string {
  // ドラッグ中は primaryBg でハイライトし、つかんでいる行を視覚的に強調する
  return isActive ? colors.primaryBg : colors.white;
}

export function ExerciseReorderModal({
  visible,
  exercises,
  onSave,
  onClose,
}: ExerciseReorderModalProps) {
  const insets = useSafeAreaInsets();
  // 内部で並び順の状態を管理する
  // visible=true になるたびに exercises の順序を初期値として設定する
  const [orderedItems, setOrderedItems] = useState<Exercise[]>(exercises);

  // visible が true になったとき親から受け取った exercises で内部状態を初期化する
  // useEffect は visible の変化に反応するが、モーダルが表示済みのときは不要な再初期化を避ける
  React.useEffect(() => {
    if (visible) {
      setOrderedItems(exercises);
    }
  }, [visible, exercises]);

  /** ドラッグ終了時に内部の並び順を更新する */
  /* istanbul ignore next -- ドラッグ操作はネイティブAPIに依存するためユニットテスト対象外 */
  const handleDragEnd = useCallback(({ data }: { data: Exercise[] }) => {
    setOrderedItems(data);
  }, []);

  /** 「保存する」タップ: 現在の並び順を親に渡す */
  const handleSave = useCallback(() => {
    onSave(orderedItems);
  }, [orderedItems, onSave]);

  /** リスト各行のレンダリング */
  /* istanbul ignore next -- ドラッグ操作（drag コールバック）はネイティブ依存 */
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Exercise>) => (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: getRowBackgroundColor(isActive),
        }}
      >
        {/* ドラッグハンドル（ロングプレスでドラッグ開始） */}
        <Pressable
          testID={`drag-handle-${item.id}`}
          onLongPress={drag}
          hitSlop={8}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              color: colors.textSecondary,
            }}
          >
            ☰
          </Text>
        </Pressable>

        {/* 種目情報 */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textPrimary,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
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
                {MUSCLE_GROUP_LABELS[item.muscleGroup] ?? item.muscleGroup}
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
                {EQUIPMENT_LABELS[item.equipment] ?? item.equipment}
              </Text>
            </View>
          </View>
        </View>
      </View>
    ),
    [],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          {/* ヘッダー */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.white,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.textPrimary,
              }}
            >
              並び替え
            </Text>
          </View>

          {/* 種目リスト（DraggableFlatList） */}
          <DraggableFlatList
            data={orderedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onDragEnd={handleDragEnd}
            style={{ flex: 1, backgroundColor: colors.white }}
          />

          {/* フッター: キャンセル・保存ボタン */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.white,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: borderRadius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.background : colors.white,
                alignItems: 'center',
              })}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.textSecondary,
                }}
              >
                キャンセル
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: borderRadius.lg,
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                alignItems: 'center',
              })}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.white,
                }}
              >
                保存する
              </Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
