/**
 * ExerciseReorderModal
 * 種目の並び順をドラッグ＆ドロップで変更するフルスクリーンモーダル
 *
 * - DraggableFlatList で全種目をロングプレス→ドラッグで並び替える
 * - 「保存」で onSave に並び替え後の配列を渡す
 * - 「キャンセル」で変更を破棄して onClose を呼ぶ
 *
 * ## レイアウト設計
 * GestureHandlerRootView は DraggableFlatList だけを包む。
 * Reanimated は GestureHandlerRootView を水平・垂直に拡張するため、
 * ヘッダーを外側の View に置くことで影響を完全に遮断する。
 *
 * ## width: windowWidth の必要性
 * Modal 内の flex:1 View は Yoga では画面幅に収まるはずだが、
 * GestureHandlerRootView 内の Reanimated が native レイヤーで親の
 * bounds を水平方向にも拡張することがある。
 * width を明示的に固定することで space-between の「保存」ボタンが
 * 画面外に押し出されるのを防ぐ。
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
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
  /** 「保存」タップ時に並び替え後の配列を渡す */
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
  // 水平方向の Reanimated 拡張を防ぐため、画面幅を明示的に取得して外側 View に固定する
  const { width: windowWidth } = useWindowDimensions();

  // 内部で並び順の状態を管理する
  // visible=true になるたびに exercises の順序を初期値として設定する
  const [orderedItems, setOrderedItems] = useState<Exercise[]>(exercises);

  // visible が true になったとき親から受け取った exercises で内部状態を初期化する
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

  /** 「保存」タップ: 現在の並び順を親に渡す */
  const handleSave = useCallback(() => {
    onSave(orderedItems);
  }, [orderedItems, onSave]);

  /** リスト各行のレンダリング
   * 行全体を Pressable にして onLongPress={drag} を設定
   * 当たり判定を ☰ アイコンだけでなく行全体に拡大する
   */
  /* istanbul ignore next -- ドラッグ操作（drag コールバック）はネイティブ依存 */
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Exercise>) => (
      <Pressable
        testID={`reorder-row-${item.id}`}
        onLongPress={drag}
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
        {/* ドラッグハンドルアイコン（視覚的なインジケーター） */}
        <View
          testID={`drag-handle-${item.id}`}
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
        </View>

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
      </Pressable>
    ),
    [],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      {/*
        外側 View: Modal の bounds に従った通常の flex コンテナ。
        ヘッダーをここに置くことで、GestureHandlerRootView の Reanimated 拡張から完全に隔離する。
        width: windowWidth を明示して、Reanimated の水平拡張がヘッダー幅に波及しないよう固定する。
      */}
      <View
        style={{
          width: windowWidth,
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.white,
        }}
      >
        {/* ヘッダー: GestureHandlerRootView の外側。Reanimated の影響を一切受けない */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.white,
          }}
        >
          {/* 左: キャンセルボタン（アウトライン） */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.background : colors.white,
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

          {/* 中央: タイトル。position:absolute で全幅中央に固定 */}
          <Text
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textPrimary,
            }}
          >
            並び替え
          </Text>

          {/* 右: 保存ボタン（青背景・白文字） */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              paddingVertical: 7,
              paddingHorizontal: 16,
              borderRadius: borderRadius.md,
              backgroundColor: pressed ? colors.primaryDark : colors.primary,
            })}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.white,
              }}
            >
              保存
            </Text>
          </Pressable>
        </View>

        {/*
          GestureHandlerRootView は DraggableFlatList だけを包む。
          Reanimated がここを拡張しても、上のヘッダーには影響しない。
        */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={orderedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onDragEnd={handleDragEnd}
            containerStyle={{ flex: 1 }}
            style={{ flex: 1, backgroundColor: colors.white }}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          />
        </GestureHandlerRootView>
      </View>
    </Modal>
  );
}
