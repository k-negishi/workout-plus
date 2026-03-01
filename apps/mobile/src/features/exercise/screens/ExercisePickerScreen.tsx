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
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/shared/constants';
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
    {/* Issue #116: 追加済みバッジ（successBg = '#E6FAF1', success = '#10B981'） */}
    {!!isAdded && (
      <View
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: borderRadius.md,
          backgroundColor: colors.successBg,
        }}
      >
        {/* 13px は constants にないためそのまま維持 */}
        <Text style={{ fontSize: 13, fontWeight: fontWeight.semibold, color: colors.success }}>
          追加済み
        </Text>
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
        color={isFavorite ? colors.warning : '#CBD5E1'}
      />
    </TouchableOpacity>
  </View>
);

/**
 * Issue #136: 種目リストのヘッダーコンポーネント
 * カスタム種目作成フォームをリスト先頭に表示する。
 * FAB タップ時にフォームが即座に見えるよう ListHeaderComponent に配置。
 * Issue #205: React.memo でラップしてチップ選択時の不要な再レンダーを防止。
 *             TouchableOpacity + 静的スタイルで NativeWind v4 との互換性を確保。
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
        {/* border色はcolors.border = '#e2e8f0' */}
        <View
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            padding: spacing.md,
          }}
        >
          <TextInput
            style={{
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: fontSize.md,
              color: colors.textPrimary,
              marginBottom: 12,
            }}
            placeholder="種目名を入力"
            value={newExerciseName}
            onChangeText={onNameChange}
          />
          {/* fontSize.sm = 16px, textSecondary = '#64748b' */}
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textSecondary,
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            部位
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {MUSCLE_GROUP_OPTIONS.map((opt) => (
              // NativeWind v4 の jsxImportSource は Pressable の style 関数を無視するため
              // TouchableOpacity + 静的スタイルオブジェクトを使用する（RecentWorkoutCard と同パターン）
              <TouchableOpacity
                key={opt.key}
                testID={`muscle-chip-${opt.key}`}
                onPress={() => onMuscleGroupChange(opt.key)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: spacing.xs,
                  // ピル形状のため999は固定値として維持
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: newMuscleGroup === opt.key ? colors.primary : '#CBD5E1',
                  backgroundColor: newMuscleGroup === opt.key ? colors.primaryBg : colors.inputBg,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    color: newMuscleGroup === opt.key ? colors.primary : colors.textSecondary,
                    fontWeight:
                      newMuscleGroup === opt.key ? fontWeight.semibold : fontWeight.normal,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* fontSize.sm = 16px, textSecondary = '#64748b' */}
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textSecondary,
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            器具
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {EQUIPMENT_OPTIONS.map((opt) => (
              // NativeWind v4 の jsxImportSource は Pressable の style 関数を無視するため
              // TouchableOpacity + 静的スタイルオブジェクトを使用する（RecentWorkoutCard と同パターン）
              <TouchableOpacity
                key={opt.key}
                testID={`equipment-chip-${opt.key}`}
                onPress={() => onEquipmentChange(opt.key)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: spacing.xs,
                  // ピル形状のため999は固定値として維持
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: newEquipment === opt.key ? colors.primary : '#CBD5E1',
                  backgroundColor: newEquipment === opt.key ? colors.primaryBg : colors.inputBg,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    color: newEquipment === opt.key ? colors.primary : colors.textSecondary,
                    fontWeight: newEquipment === opt.key ? fontWeight.semibold : fontWeight.normal,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* 17px は constants にないためそのまま維持（white = colors.white） */}
          <TouchableOpacity
            onPress={onSubmit}
            style={{
              marginTop: spacing.md,
              paddingVertical: 10,
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: fontWeight.semibold, color: colors.white }}>
              作成して追加
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} className="items-center mt-2 mb-1">
            {/* 17px は constants にないためそのまま維持 */}
            <Text style={{ fontSize: 17, color: colors.textSecondary }}>キャンセル</Text>
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
          // white = colors.white
          backgroundColor: colors.white,
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          // border = '#e2e8f0'
          borderBottomColor: colors.border,
        }}
      >
        {/* 戻るボタン: テキスト「‹」から Ionicons chevron-back に変更 */}
        <TouchableOpacity
          onPress={handleClose}
          accessibilityLabel="戻る"
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          {/* textPrimary = '#475569' */}
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* タイトル: fontSize 17（constants にないためそのまま維持） / fontWeight semibold / textTertiary = '#334155' */}
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: fontWeight.semibold,
            color: colors.textTertiary,
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

      {/* 検索バー（inputBg = '#FAFBFC', border = '#e2e8f0', textSecondary = '#64748b', textPrimary = '#475569'） */}
      <View className="px-4 py-2">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          {/* 15px は constants にないためそのまま維持 */}
          <Text style={{ fontSize: 15, color: colors.textSecondary, marginRight: spacing.sm }}>
            {'🔍'}
          </Text>
          <TextInput
            style={{ flex: 1, fontSize: fontSize.sm, color: colors.textPrimary }}
            placeholder="種目を検索..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* カテゴリタブ（border = '#e2e8f0'） */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.key)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                marginRight: 6,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                backgroundColor: selectedCategory === item.key ? colors.primary : colors.white,
                borderColor: selectedCategory === item.key ? colors.primary : colors.border,
              }}
            >
              {/* 15px は constants にないためそのまま維持 */}
              <Text
                style={{
                  fontSize: 15,
                  color: selectedCategory === item.key ? colors.white : colors.textSecondary,
                  fontWeight:
                    selectedCategory === item.key ? fontWeight.semibold : fontWeight.normal,
                }}
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
          /* inputBg = '#FAFBFC' に近い '#F8FAFC' はcolors.inputBgより微妙に異なるが近似としてcolors.inputBgを使用 */
          <View
            style={{
              backgroundColor: colors.inputBg,
              paddingHorizontal: 20,
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {/* お気に入りセクションにはスターアイコンを前置して視認性を高める */}
              {/* warning = '#F59E0B' */}
              {section.title === 'お気に入り' && (
                <Ionicons name="star" size={13} color={colors.warning} />
              )}
              {/* 12px は constants にないためそのまま維持 */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: fontWeight.bold,
                  color: '#94a3b8',
                  letterSpacing: 0.3,
                }}
              >
                {section.title}
              </Text>
            </View>
            {/* 11px は constants にないためそのまま維持 */}
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
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    // primaryBg = '#E6F2FF', white = colors.white
                    backgroundColor: isSelected ? colors.primaryBg : colors.white,
                    // 選択中は左ボーダーでアクセント
                    borderLeftWidth: isSelected ? 3 : 0,
                    borderLeftColor: isSelected ? colors.primary : 'transparent',
                  },
                  isAdded ? { opacity: 0.5 } : undefined,
                ]}
              >
                {/* T038: multi モード時のチェックボックス */}
                {mode === 'multi' && (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: borderRadius.md,
                      borderWidth: 2,
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      // primary = '#4D94FF', white = colors.white, border = '#e2e8f0'
                      backgroundColor: isSelected ? colors.primary : colors.white,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    {!!isSelected && (
                      // fontSize.xs = 14px
                      <Text
                        style={{
                          color: colors.white,
                          fontSize: fontSize.xs,
                          fontWeight: fontWeight.bold,
                        }}
                      >
                        {'✓'}
                      </Text>
                    )}
                  </View>
                )}

                {/* 種目情報 */}
                <View className="flex-1">
                  {/* textTertiary = '#334155', fontSize.sm = 16px */}
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.semibold,
                      color: colors.textTertiary,
                    }}
                  >
                    {item.name}
                  </Text>
                  <View className="flex-row gap-1.5 mt-1">
                    {/* Issue #205: 部位バッジ（primaryBg = '#E6F2FF', primaryDark = '#3385FF', fontSize.xs = 14px） */}
                    <View
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.primaryBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.xs,
                          fontWeight: fontWeight.semibold,
                          color: colors.primaryDark,
                        }}
                      >
                        {getMuscleGroupLabel(item.muscleGroup)}
                      </Text>
                    </View>
                    {/* Issue #205: 器具バッジ（neutralBg = '#F1F5F9', textSecondary = '#64748b', fontSize.sm = 16px） */}
                    <View
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.neutralBg,
                      }}
                    >
                      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
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

      {/* T038: multi モード時のフッター（border = colors.border, white = colors.white） */}
      {mode === 'multi' && (
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.white,
          }}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              alignItems: 'center',
            }}
          >
            {/* fontSize.sm = 16px, textSecondary = '#64748b' */}
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.textSecondary,
              }}
            >
              キャンセル
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddSelected}
            disabled={selectedIds.size === 0}
            style={{
              flex: 2,
              paddingVertical: 12,
              borderRadius: borderRadius.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: colors.primary,
              opacity: selectedIds.size === 0 ? 0.5 : 1,
            }}
          >
            {selectedIds.size > 0 && (
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                }}
              >
                {/* 13px は constants にないためそのまま維持 */}
                <Text style={{ fontSize: 13, fontWeight: fontWeight.bold, color: colors.white }}>
                  {selectedIds.size}
                </Text>
              </View>
            )}
            {/* fontSize.sm = 16px */}
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.white,
              }}
            >
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
        okLabel="閉じる"
        onOk={() => setIsDuplicateError(false)}
      />
    </View>
  );
};

/** Issue #155: スワイプ「履歴」ボタンスタイル（primaryBg = '#E6F2FF', primary = '#4D94FF'） */
const swipeStyles = StyleSheet.create({
  historyButton: {
    width: 72,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonText: {
    // 13px は constants にないためそのまま維持
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: 2,
  },
});

/** Issue #136: FAB スタイル（absolute 配置は StyleSheet で確実に効かせる） */
const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    // ピル形状のため28は固定値として維持
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
