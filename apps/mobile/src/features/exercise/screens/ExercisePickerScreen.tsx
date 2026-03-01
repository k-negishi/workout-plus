/**
 * T038: 種目選択画面（ExercisePickerScreen）
 * 通常ページとして種目を選択する（pushナビゲーション）
 * single モード: タップで即選択、multi モード: チェックボックス選択 + 一括追加
 * Issue #116: 追加済み種目にバッジ表示 + タップ無効化
 * Issue #155: 左スワイプで「履歴」ボタン表示 → ExerciseHistoryFullScreen へ遷移
 *             既存インライン編集（T039）を履歴画面へ移管し削除
 * Issue #205: 部位・器具に「その他」追加、重複種目名チェック、パフォーマンス改善
 */
import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseRepository } from '@/database/repositories/exercise';
import { AlertDialog } from '@/shared/components/AlertDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { showErrorToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Equipment, Exercise, HomeStackParamList, MuscleGroup } from '@/types';

import { useWorkoutSession } from '../../workout/hooks/useWorkoutSession';
import { ExerciseReorderModal } from '../components/ExerciseReorderModal';
import { MUSCLE_GROUP_LABELS, useExerciseSearch } from '../hooks/useExerciseSearch';

/**
 * T08: RecordStackParamList 廃止につき HomeStackParamList に変更。
 * HomeStack/CalendarStack 両方に同じ画面を配置するが、
 * useNavigation/useRoute が実行時のスタックコンテキストを使うため型が一致していれば問題ない。
 */
type PickerNavProp = NativeStackNavigationProp<HomeStackParamList, 'ExercisePicker'>;
type PickerRouteProp = RouteProp<HomeStackParamList, 'ExercisePicker'>;

/** カテゴリタブの部位リスト */
const CATEGORIES: Array<{ key: MuscleGroup | null; label: string }> = [
  { key: null, label: '全て' },
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背中' },
  { key: 'legs', label: '脚' },
  { key: 'shoulders', label: '肩' },
  { key: 'biceps', label: '二頭' },
  { key: 'triceps', label: '三頭' },
  { key: 'abs', label: '腹筋' },
  { key: 'other', label: 'その他' },
];

/** 器具の日本語ラベル */
const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'バーベル',
  dumbbell: 'ダンベル',
  machine: 'マシン',
  cable: 'ケーブル',
  bodyweight: '自重',
  other: 'その他',
};

/** 部位ラベルを返すヘルパー（renderItem の ?? 演算子を削減） */
function getMuscleGroupLabel(key: MuscleGroup | string): string {
  return MUSCLE_GROUP_LABELS[key as MuscleGroup] ?? key;
}

/** 器具ラベルを返すヘルパー（renderItem の ?? 演算子を削減） */
function getEquipmentLabel(key: Equipment | string): string {
  return EQUIPMENT_LABELS[key as Equipment] ?? key;
}

/**
 * ⇅ ボタンのテキスト色を返す
 * 部位フィルターなし（全て表示中）のとき disabled としてグレーアウトする
 */
function getReorderButtonColor(isDisabled: boolean): string {
  return isDisabled ? 'text-[#cbd5e1]' : 'text-[#475569]';
}

/** 器具チップ選択肢 */
const EQUIPMENT_OPTIONS: Array<{ key: Equipment; label: string }> = [
  { key: 'barbell', label: 'バーベル' },
  { key: 'dumbbell', label: 'ダンベル' },
  { key: 'machine', label: 'マシン' },
  { key: 'cable', label: 'ケーブル' },
  { key: 'bodyweight', label: '自重' },
  { key: 'other', label: 'その他' },
];

/** 部位チップ選択肢（Issue #205: 「二頭筋」→「二頭」、「三頭筋」→「三頭」、「その他」追加） */
const MUSCLE_GROUP_OPTIONS: Array<{ key: MuscleGroup; label: string }> = [
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背中' },
  { key: 'legs', label: '脚' },
  { key: 'shoulders', label: '肩' },
  { key: 'biceps', label: '二頭' },
  { key: 'triceps', label: '三頭' },
  { key: 'abs', label: '腹筋' },
  { key: 'other', label: 'その他' },
];

/**
 * Issue #116: 種目アクションボタン群コンポーネント
 * renderItem の complexity 削減のためコンポーネントに分離
 * Issue #166: スターを Ionicons に変更して視認性を向上
 */
const ExerciseItemActions: React.FC<{
  isAdded: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ isAdded, isFavorite, onToggleFavorite }) => (
  <View className="flex-row items-center gap-1">
    {/* Issue #116: 追加済みバッジ */}
    {isAdded && (
      <View className="px-2 py-[3px] rounded-lg bg-[#E6FAF1]">
        <Text className="text-[13px] font-semibold text-[#10B981]">追加済み</Text>
      </View>
    )}
    {/* お気に入りボタン: Ionicons でサイズ・コントラストを確保 */}
    <TouchableOpacity
      onPress={onToggleFavorite}
      className="w-8 h-8 items-center justify-center"
      hitSlop={4}
      accessibilityLabel={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={20}
        color={isFavorite ? '#F59E0B' : '#CBD5E1'}
      />
    </TouchableOpacity>
  </View>
);

/**
 * Issue #136: 種目リストのヘッダーコンポーネント
 * カスタム種目作成フォームをリスト先頭に表示する。
 * FAB タップ時にフォームが即座に見えるよう ListHeaderComponent に配置。
 * Issue #205: React.memo でラップしてチップ選択時の不要な再レンダーを防止。
 *             Pressable を使うことでアニメーション遅延なしの即時フィードバック。
 */
const ExerciseListHeader: React.FC<{
  isCreating: boolean;
  newExerciseName: string;
  newMuscleGroup: MuscleGroup;
  newEquipment: Equipment;
  onNameChange: (text: string) => void;
  onMuscleGroupChange: (mg: MuscleGroup) => void;
  onEquipmentChange: (eq: Equipment) => void;
  onSubmit: () => void;
  onCancel: () => void;
}> = React.memo(
  ({
    isCreating,
    newExerciseName,
    newMuscleGroup,
    newEquipment,
    onNameChange,
    onMuscleGroupChange,
    onEquipmentChange,
    onSubmit,
    onCancel,
  }) =>
    isCreating ? (
      <View className="px-5 py-4">
        <View className="border border-dashed border-[#e2e8f0] rounded-lg p-4">
          <TextInput
            className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[18px] text-[#475569] mb-3"
            placeholder="種目名を入力"
            value={newExerciseName}
            onChangeText={onNameChange}
          />
          <Text className="text-[16px] font-semibold text-[#64748b] tracking-wide mb-1.5">
            部位
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {MUSCLE_GROUP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                testID={`muscle-chip-${opt.key}`}
                onPress={() => onMuscleGroupChange(opt.key)}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  // 未選択時は #CBD5E1（より視認性の高いグレー）で枠を明示する
                  borderColor: newMuscleGroup === opt.key ? '#4D94FF' : '#CBD5E1',
                  // 未選択時は #F8FAFC（薄グレー）で白背景と区別してボタン形状を際立たせる
                  backgroundColor: pressed
                    ? '#D6EAFF'
                    : newMuscleGroup === opt.key
                      ? '#E6F2FF'
                      : '#F8FAFC',
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: newMuscleGroup === opt.key ? '#4D94FF' : '#64748b',
                    fontWeight: newMuscleGroup === opt.key ? '600' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-[16px] font-semibold text-[#64748b] tracking-wide mb-1.5">
            器具
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                testID={`equipment-chip-${opt.key}`}
                onPress={() => onEquipmentChange(opt.key)}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  // 未選択時は #CBD5E1（より視認性の高いグレー）で枠を明示する
                  borderColor: newEquipment === opt.key ? '#4D94FF' : '#CBD5E1',
                  // 未選択時は #F8FAFC（薄グレー）で白背景と区別してボタン形状を際立たせる
                  backgroundColor: pressed
                    ? '#D6EAFF'
                    : newEquipment === opt.key
                      ? '#E6F2FF'
                      : '#F8FAFC',
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: newEquipment === opt.key ? '#4D94FF' : '#64748b',
                    fontWeight: newEquipment === opt.key ? '600' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TouchableOpacity
            onPress={onSubmit}
            className="py-2.5 bg-[#4D94FF] rounded-lg items-center"
          >
            <Text className="text-[17px] font-semibold text-white">作成して追加</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} className="items-center mt-2">
            <Text className="text-[17px] text-[#64748b]">キャンセル</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null,
);

export const ExercisePickerScreen: React.FC = () => {
  const navigation = useNavigation<PickerNavProp>();
  const route = useRoute<PickerRouteProp>();
  const session = useWorkoutSession();
  // SafeArea 対応: ノッチ・ダイナミックアイランド対応
  const insets = useSafeAreaInsets();
  const { query, setQuery, selectedCategory, setSelectedCategory, sections, loadExercises } =
    useExerciseSearch();

  // Issue #116: 現在のワークアウトに追加済みの exerciseId セットを構築
  // currentExercises が更新されると再計算される
  const currentExercises = useWorkoutSessionStore((s) => s.currentExercises);
  const addedExerciseIds = useMemo(
    () => new Set(currentExercises.map((e) => e.exerciseId)),
    [currentExercises],
  );

  // T038: mode パラメータ（デフォルト: single）
  const mode = (route.params as { mode?: 'single' | 'multi' } | undefined)?.mode ?? 'single';

  // multi モードの選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // カスタム種目作成フォームの表示状態
  const [isCreating, setIsCreating] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup>('chest');
  const [newEquipment, setNewEquipment] = useState<Equipment>('barbell');

  // 並び替えモーダル表示状態
  const [isReorderModalVisible, setIsReorderModalVisible] = useState(false);

  // Issue #205: 種目名重複エラーダイアログ表示状態
  const [isDuplicateError, setIsDuplicateError] = useState(false);

  // フィルター適用後に表示されている種目（並び替えモーダルに渡す対象）
  // sections を平坦化して現在のフィルター条件での表示種目を取得する
  const visibleExercises = useMemo(() => sections.flatMap((section) => section.data), [sections]);

  // Issue #155: 現在開いているスワイプ行を管理（他の行タップで閉じるため）
  const openedSwipeableRef = useRef<Swipeable | null>(null);

  /** single モード: 種目を選択する */
  const handleSelectExercise = useCallback(
    async (exercise: Exercise) => {
      // Issue #116: 追加済み種目はタップ無効（UI側でも防護）
      if (addedExerciseIds.has(exercise.id)) return;

      if (mode === 'multi') {
        // multi モード: 選択状態をトグル
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(exercise.id)) {
            next.delete(exercise.id);
          } else {
            next.add(exercise.id);
          }
          return next;
        });
      } else {
        // single モード: 即選択
        // goBack() を先に呼んでから addExercise を実行する。
        // await してから goBack() すると画面遷移が遅れて UX が悪化するため、
        // 非同期保存はバックグラウンドで実行する。
        navigation.goBack();
        void session.addExercise(exercise.id);
      }
    },
    // addedExerciseIds を deps に含める: Set の変化でコールバックを再生成し stale closure を防ぐ
    [mode, session, navigation, addedExerciseIds],
  );

  /** multi モード: 選択した種目を一括追加 */
  const handleAddSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await session.addExercise(id);
    }
    navigation.goBack();
  }, [selectedIds, session, navigation]);

  /** お気に入りトグル: DB更新後にリストを再取得してUIを即時反映する */
  const handleToggleFavorite = useCallback(
    async (exerciseId: string) => {
      await ExerciseRepository.toggleFavorite(exerciseId);
      await loadExercises();
    },
    [loadExercises],
  );

  /** カスタム種目を作成する（Issue #205: 重複名チェックを追加） */
  const handleCreateCustom = useCallback(async () => {
    if (!newExerciseName.trim()) return;

    try {
      // 同名の種目が既に存在する場合はエラーダイアログを表示して中断する
      const existing = await ExerciseRepository.findByExactName(newExerciseName.trim());
      if (existing) {
        setIsDuplicateError(true);
        return;
      }

      const row = await ExerciseRepository.create({
        name: newExerciseName.trim(),
        muscleGroup: newMuscleGroup,
        equipment: newEquipment,
      });
      if (mode === 'single') {
        await session.addExercise(row.id);
        navigation.goBack();
      } else {
        setSelectedIds((prev) => new Set(prev).add(row.id));
      }
      setIsCreating(false);
      setNewExerciseName('');
    } catch {
      showErrorToast('種目の作成に失敗しました');
    }
  }, [newExerciseName, newMuscleGroup, newEquipment, mode, session, navigation]);

  /** 閉じる */
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * 並び替えモーダルの「保存する」ハンドラ
   * 新しい並び順を DB に保存し、リストを再読み込みする
   */
  const handleReorderSave = useCallback(
    async (ordered: Exercise[]) => {
      const updates = ordered.map((ex, index) => ({ id: ex.id, sortOrder: index + 1 }));
      await ExerciseRepository.updateSortOrders(updates);
      await loadExercises();
      setIsReorderModalVisible(false);
    },
    [loadExercises],
  );

  /**
   * Issue #155: 種目履歴画面へ遷移する
   * スワイプボタンのタップ時に呼び出す
   */
  const handleNavigateToHistory = useCallback(
    (exerciseId: string, exerciseName: string) => {
      openedSwipeableRef.current?.close();
      navigation.navigate('ExerciseHistory', { exerciseId, exerciseName });
    },
    [navigation],
  );

  const sectionData = sections.map((section) => ({
    title: section.title,
    data: section.data,
  }));

  return (
    <View className="flex-1 bg-white">
      {/* Issue #142: 白ヘッダー（統一スタイル）
          背景白・下ボーダー・Ionicons 戻るボタン（左）・タイトル（中央）・並び替えボタン（右）
          paddingTop は insets.top のみ（+12 を廃止してヘッダー内の paddingBottom: 12 で吸収） */}
      <View
        testID="exercise-picker-header"
        style={{
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        {/* 戻るボタン: テキスト「‹」から Ionicons chevron-back に変更 */}
        <TouchableOpacity
          onPress={handleClose}
          accessibilityLabel="戻る"
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <Ionicons name="chevron-back" size={24} color="#475569" />
        </TouchableOpacity>

        {/* タイトル: fontSize 17 / fontWeight '600' に統一 */}
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: '#334155',
          }}
        >
          種目を選択
        </Text>

        {/* Issue #141: 並び替えボタン（部位フィルター選択時のみ有効）
            全て表示中は全種目をフラットに並び替えても意味がないため disabled にする */}
        <TouchableOpacity
          testID="reorder-button"
          onPress={() => setIsReorderModalVisible(true)}
          disabled={selectedCategory === null}
          style={{ width: 40, alignItems: 'flex-end' }}
          accessibilityLabel="並び替え"
        >
          <Text className={`text-[20px] ${getReorderButtonColor(selectedCategory === null)}`}>
            ⇅
          </Text>
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View className="px-4 py-2">
        <View className="flex-row items-center bg-[#FAFBFC] border border-[#e2e8f0] rounded-lg px-3 py-2.5">
          <Text className="text-[16px] text-[#64748b] mr-2">{'🔍'}</Text>
          <TextInput
            className="flex-1 text-[16px] text-[#475569]"
            placeholder="種目を検索..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* カテゴリタブ */}
      <View className="px-4 pb-2 border-b border-[#e2e8f0]">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.key)}
              className={`px-4 py-1.5 mr-1.5 rounded-lg border ${
                selectedCategory === item.key
                  ? 'bg-[#4D94FF] border-[#4D94FF]'
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <Text
                className={`text-[15px] ${
                  selectedCategory === item.key ? 'text-white font-semibold' : 'text-[#64748b]'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 種目リスト */}
      <SectionList
        sections={sectionData}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: mode === 'multi' ? 80 : 0, flexGrow: 1 }}
        initialNumToRender={20}
        windowSize={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="種目が見つかりません"
            description="検索ワードを変えてみてください"
          />
        }
        renderSectionHeader={({ section }) => (
          /* Issue #166: 背景色・文字色・サイズで種目行と明確に差別化 */
          <View
            style={{
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {/* お気に入りセクションにはスターアイコンを前置して視認性を高める */}
              {section.title === 'お気に入り' && <Ionicons name="star" size={13} color="#F59E0B" />}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#94a3b8',
                  letterSpacing: 0.3,
                }}
              >
                {section.title}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#cbd5e1' }}>{section.data.length}件</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          // Issue #116: 追加済み判定
          const isAdded = addedExerciseIds.has(item.id);

          return (
            // Issue #155: Swipeable で各行をラップし、左スワイプで「履歴」ボタンを表示
            <Swipeable
              ref={(ref) => {
                // 別の行が開かれた場合に前の行を閉じる
                if (ref && openedSwipeableRef.current !== ref) {
                  openedSwipeableRef.current?.close();
                  openedSwipeableRef.current = ref;
                }
              }}
              renderRightActions={() => (
                <TouchableOpacity
                  testID={`history-button-${item.id}`}
                  onPress={() => handleNavigateToHistory(item.id, item.name)}
                  style={swipeStyles.historyButton}
                >
                  <Ionicons name="stats-chart-outline" size={22} color="#4D94FF" />
                  <Text style={swipeStyles.historyButtonText}>履歴</Text>
                </TouchableOpacity>
              )}
              overshootRight={false}
            >
              <TouchableOpacity
                onPress={() => handleSelectExercise(item)}
                // Issue #116: 追加済み種目はタップ無効 + 半透明
                disabled={isAdded}
                style={isAdded ? { opacity: 0.5 } : undefined}
                className={`flex-row items-center px-5 py-3 border-b border-[#e2e8f0] ${
                  isSelected ? 'bg-[#E6F2FF] border-l-[3px] border-l-[#4D94FF]' : 'bg-white'
                }`}
              >
                {/* T038: multi モード時のチェックボックス */}
                {mode === 'multi' && (
                  <View
                    className={`w-[22px] h-[22px] rounded-lg border-2 mr-3 items-center justify-center ${
                      isSelected ? 'bg-[#4D94FF] border-[#4D94FF]' : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    {isSelected && <Text className="text-white text-[14px] font-bold">{'✓'}</Text>}
                  </View>
                )}

                {/* 種目情報 */}
                <View className="flex-1">
                  <Text className="text-[16px] font-semibold text-[#334155]">{item.name}</Text>
                  <View className="flex-row gap-1.5 mt-1">
                    {/* Issue #205: 部位バッジのフォントサイズを 13px → 14px に拡大 */}
                    <View className="px-2 py-[2px] rounded-lg bg-[#E6F2FF]">
                      <Text className="text-[14px] font-semibold text-[#3385FF]">
                        {getMuscleGroupLabel(item.muscleGroup)}
                      </Text>
                    </View>
                    {/* Issue #205: 器具バッジのフォントサイズを 15px → 16px に拡大 */}
                    <View className="px-2 py-[2px] rounded-lg bg-[#F1F3F5]">
                      <Text className="text-[16px] text-[#64748b]">
                        {getEquipmentLabel(item.equipment)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* アクションボタン群（コンポーネントに分離して complexity を削減） */}
                <ExerciseItemActions
                  isAdded={isAdded}
                  isFavorite={item.isFavorite}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                />
              </TouchableOpacity>
            </Swipeable>
          );
        }}
        ListHeaderComponent={
          <ExerciseListHeader
            isCreating={isCreating}
            newExerciseName={newExerciseName}
            newMuscleGroup={newMuscleGroup}
            newEquipment={newEquipment}
            onNameChange={setNewExerciseName}
            onMuscleGroupChange={setNewMuscleGroup}
            onEquipmentChange={setNewEquipment}
            onSubmit={handleCreateCustom}
            onCancel={() => {
              setIsCreating(false);
              setNewExerciseName('');
            }}
          />
        }
        ListFooterComponent={
          /* FAB と重ならないための余白 */
          <View style={{ height: 88 }} />
        }
      />

      {/* T038: multi モード時のフッター */}
      {mode === 'multi' && (
        <View className="flex-row gap-3 px-5 py-3 border-t border-[#e2e8f0] bg-white">
          <TouchableOpacity
            onPress={handleClose}
            className="flex-1 py-3 border border-[#e2e8f0] rounded-lg items-center"
          >
            <Text className="text-[16px] font-semibold text-[#64748b]">キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddSelected}
            disabled={selectedIds.size === 0}
            className={`flex-[2] py-3 rounded-lg items-center flex-row justify-center gap-1 ${
              selectedIds.size === 0 ? 'bg-[#4D94FF] opacity-50' : 'bg-[#4D94FF]'
            }`}
          >
            {selectedIds.size > 0 && (
              <View className="w-5 h-5 rounded-full bg-white/30 items-center justify-center mr-1">
                <Text className="text-[13px] font-bold text-white">{selectedIds.size}</Text>
              </View>
            )}
            <Text className="text-[16px] font-semibold text-white">
              {selectedIds.size > 0 ? `${selectedIds.size}種目を追加` : '種目を選択'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Issue #141: 並び替えモーダル */}
      <ExerciseReorderModal
        visible={isReorderModalVisible}
        exercises={visibleExercises}
        onSave={handleReorderSave}
        onClose={() => setIsReorderModalVisible(false)}
      />

      {/* Issue #136: カスタム種目追加 FAB（フォーム表示中は非表示） */}
      {!isCreating && (
        <TouchableOpacity
          style={[fabStyles.container, mode === 'multi' ? { bottom: 80 } : undefined]}
          onPress={() => setIsCreating(true)}
          activeOpacity={0.8}
          accessibilityLabel="カスタム種目を追加"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Issue #205: 種目名重複登録エラーダイアログ */}
      <AlertDialog
        visible={isDuplicateError}
        title="重複する種目名"
        message="同じ名前の種目がすでに存在します"
        okLabel="OK"
        onOk={() => setIsDuplicateError(false)}
      />
    </View>
  );
};

/** Issue #155: スワイプ「履歴」ボタンスタイル */
const swipeStyles = StyleSheet.create({
  historyButton: {
    width: 72,
    backgroundColor: '#E6F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4D94FF',
    marginTop: 2,
  },
});

/** Issue #136: FAB スタイル（absolute 配置は StyleSheet で確実に効かせる） */
const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4D94FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
