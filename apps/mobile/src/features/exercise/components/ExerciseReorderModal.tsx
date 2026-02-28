/**
 * ExerciseReorderModal
 * 種目の並び順をドラッグ＆ドロップで変更するフルスクリーンモーダル
 *
 * - DraggableFlatList で全種目をロングプレス→ドラッグで並び替える
 * - 「保存する」で onSave に並び替え後の配列を渡す
 * - 「キャンセル」で変更を破棄して onClose を呼ぶ
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

/**
 * ヘッダーの高さ初期値（px）。
 * DraggableFlatList の Reanimated が Yoga flex チェーンを破壊するため absolute 配置に切り替えた。
 * onLayout で実測値が確定するまでの間、リストとヘッダーが重なるフラッシュを防ぐために使用。
 * paddingVertical:14×2 + lineHeight.sm:24 = 52px
 */
const HEADER_HEIGHT_INITIAL = 52;

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
  // Reanimated が GestureHandlerRootView の flex:1 を拡張するのを防ぐため、
  // 画面サイズを明示的に取得して absolute 基準コンテナのサイズを固定する
  // フッター撤廃により幅は不要。高さのみ GestureHandlerRootView のサイズ固定に使用
  const { height: windowHeight } = useWindowDimensions();

  // 内部で並び順の状態を管理する
  // visible=true になるたびに exercises の順序を初期値として設定する
  const [orderedItems, setOrderedItems] = useState<Exercise[]>(exercises);

  // ヘッダーの実測高さ（onLayout で確定）。リスト領域の top 計算に使用
  const [headerH, setHeaderH] = useState(HEADER_HEIGHT_INITIAL);

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

  /** 「保存する」タップ: 現在の並び順を親に渡す */
  const handleSave = useCallback(() => {
    onSave(orderedItems);
  }, [orderedItems, onSave]);

  /** リスト各行のレンダリング
   * Issue #183: 行全体を Pressable にして onLongPress={drag} を設定
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
      {/* height を明示することで DraggableFlatList の Reanimated による垂直拡張を封じる。
          flex:1 だけでは iOS 実機でコンテナが拡張されフッターが画面外に出ることが確認済み。
          フッターをヘッダーへ移動することでレイアウト問題を根本解消した */}
      <GestureHandlerRootView style={{ height: windowHeight, backgroundColor: colors.background }}>
        {/* ① ヘッダー: iOS 標準パターン（左:キャンセル / 中央:タイトル / 右:保存）。
            フッター廃止により Reanimated によるボタン押し出し問題が根本解消される */}
        <View
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            zIndex: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.white,
          }}
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        >
          {/* 左: キャンセルボタン（hitSlop で Apple HIG 最小 44pt のタップ領域を確保） */}
          <Pressable
            onPress={onClose}
            style={{ paddingVertical: 2, paddingHorizontal: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

          {/* 中央: タイトル */}
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textPrimary,
            }}
          >
            並び替え
          </Text>

          {/* 右: 保存ボタン */}
          <Pressable
            onPress={handleSave}
            style={{ paddingVertical: 2, paddingHorizontal: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.primary,
              }}
            >
              保存
            </Text>
          </Pressable>
        </View>

        {/* ② リスト: ヘッダーの実測高さで top を確定。
            bottom は SafeArea の insets.bottom で処理する */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + headerH,
            bottom: insets.bottom,
            left: 0,
            right: 0,
          }}
        >
          <DraggableFlatList
            data={orderedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onDragEnd={handleDragEnd}
            containerStyle={{ flex: 1 }}
            style={{ flex: 1, backgroundColor: colors.white }}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
