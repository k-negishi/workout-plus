/**
 * T038: 種目選択画面（ExercisePickerScreen）
 * 通常ページとして種目を選択する（pushナビゲーション）
 * single モード: タップで即選択、multi モード: チェックボックス選択 + 一括追加
 * T039: カスタム種目編集フォーム内蔵
 * Issue #116: 追加済み種目にバッジ表示 + タップ無効化
 */
import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseRepository } from '@/database/repositories/exercise';
import { EmptyState } from '@/shared/components/EmptyState';
import { showErrorToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Equipment, Exercise, HomeStackParamList, MuscleGroup } from '@/types';

import { useWorkoutSession } from '../../workout/hooks/useWorkoutSession';
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
  { key: 'abs', label: '腹' },
];

/** 器具の日本語ラベル */
const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'バーベル',
  dumbbell: 'ダンベル',
  machine: 'マシン',
  cable: 'ケーブル',
  bodyweight: '自重',
};

/** 部位ラベルを返すヘルパー（renderItem の ?? 演算子を削減） */
function getMuscleGroupLabel(key: MuscleGroup | string): string {
  return MUSCLE_GROUP_LABELS[key as MuscleGroup] ?? key;
}

/** 器具ラベルを返すヘルパー（renderItem の ?? 演算子を削減） */
function getEquipmentLabel(key: Equipment | string): string {
  return EQUIPMENT_LABELS[key as Equipment] ?? key;
}

/** 器具チップ選択肢 */
const EQUIPMENT_OPTIONS: Array<{ key: Equipment; label: string }> = [
  { key: 'barbell', label: 'バーベル' },
  { key: 'dumbbell', label: 'ダンベル' },
  { key: 'machine', label: 'マシン' },
  { key: 'cable', label: 'ケーブル' },
  { key: 'bodyweight', label: '自重' },
];

/** 部位チップ選択肢 */
const MUSCLE_GROUP_OPTIONS: Array<{ key: MuscleGroup; label: string }> = [
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背中' },
  { key: 'legs', label: '脚' },
  { key: 'shoulders', label: '肩' },
  { key: 'biceps', label: '二頭筋' },
  { key: 'triceps', label: '三頭筋' },
  { key: 'abs', label: '腹筋' },
];

/**
 * Issue #116: 種目アクションボタン群コンポーネント
 * renderItem の complexity 削減のためコンポーネントに分離
 */
const ExerciseItemActions: React.FC<{
  isAdded: boolean;
  isCustom: boolean;
  isFavorite: boolean;
  onStartEdit: () => void;
  onToggleFavorite: () => void;
}> = ({ isAdded, isCustom, isFavorite, onStartEdit, onToggleFavorite }) => (
  <View className="flex-row items-center gap-1">
    {/* Issue #116: 追加済みバッジ */}
    {isAdded && (
      <View className="px-2 py-[3px] rounded-lg bg-[#E6FAF1]">
        <Text className="text-[13px] font-semibold text-[#10B981]">追加済み</Text>
      </View>
    )}
    {/* T039: カスタム種目の編集ボタン */}
    {isCustom && (
      <TouchableOpacity
        onPress={onStartEdit}
        className="w-7 h-7 items-center justify-center"
        hitSlop={4}
      >
        <Text className="text-[16px] text-[#64748b] opacity-50">{'✎'}</Text>
      </TouchableOpacity>
    )}
    {/* お気に入りボタン */}
    <TouchableOpacity
      onPress={onToggleFavorite}
      className="w-7 h-7 items-center justify-center"
      hitSlop={4}
      accessibilityLabel={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
    >
      <Text
        className={`text-[17px] ${isFavorite ? 'text-[#F59E0B]' : 'text-[#64748b] opacity-50'}`}
      >
        {isFavorite ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  </View>
);

/**
 * T039: インライン編集フォームコンポーネント
 * renderItem の complexity 削減のためコンポーネントに分離
 */
const InlineEditForm: React.FC<{
  editName: string;
  editMuscleGroup: MuscleGroup;
  editEquipment: Equipment;
  onNameChange: (text: string) => void;
  onMuscleGroupChange: (mg: MuscleGroup) => void;
  onEquipmentChange: (eq: Equipment) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({
  editName,
  editMuscleGroup,
  editEquipment,
  onNameChange,
  onMuscleGroupChange,
  onEquipmentChange,
  onSave,
  onCancel,
}) => (
  <View className="px-5 py-3 bg-[#f9fafb] border-b border-[#e2e8f0]">
    <TextInput
      className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[16px] text-[#475569] mb-3"
      placeholder="種目名"
      value={editName}
      onChangeText={onNameChange}
      autoFocus
    />
    <Text className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">部位</Text>
    <View className="flex-row flex-wrap gap-1.5 mb-3">
      {MUSCLE_GROUP_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onMuscleGroupChange(opt.key)}
          className={`px-2.5 py-1 rounded-full border ${
            editMuscleGroup === opt.key ? 'bg-[#E6F2FF] border-[#4D94FF]' : 'border-[#e2e8f0]'
          }`}
        >
          <Text
            className={`text-[14px] ${
              editMuscleGroup === opt.key ? 'text-[#4D94FF] font-semibold' : 'text-[#64748b]'
            }`}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <Text className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">器具</Text>
    <View className="flex-row flex-wrap gap-1.5 mb-3">
      {EQUIPMENT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onEquipmentChange(opt.key)}
          className={`px-2.5 py-1 rounded-full border ${
            editEquipment === opt.key ? 'bg-[#E6F2FF] border-[#4D94FF]' : 'border-[#e2e8f0]'
          }`}
        >
          <Text
            className={`text-[14px] ${
              editEquipment === opt.key ? 'text-[#4D94FF] font-semibold' : 'text-[#64748b]'
            }`}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <View className="flex-row gap-2">
      <TouchableOpacity
        onPress={onSave}
        className="flex-1 py-2.5 bg-[#4D94FF] rounded-lg items-center"
      >
        <Text className="text-[15px] font-semibold text-white">保存</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} className="px-4 py-2.5 items-center">
        <Text className="text-[15px] text-[#64748b]">キャンセル</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Issue #136: 種目リストのヘッダーコンポーネント
 * カスタム種目作成フォームをリスト先頭に表示する。
 * FAB タップ時にフォームが即座に見えるよう ListHeaderComponent に配置。
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
}> = ({
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
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[16px] text-[#475569] mb-3"
          placeholder="種目名を入力"
          value={newExerciseName}
          onChangeText={onNameChange}
          autoFocus
        />
        <Text className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">
          部位
        </Text>
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {MUSCLE_GROUP_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onMuscleGroupChange(opt.key)}
              className={`px-2.5 py-1 rounded-full border ${
                newMuscleGroup === opt.key
                  ? 'bg-[#E6F2FF] border-[#4D94FF]'
                  : 'border-[#e2e8f0]'
              }`}
            >
              <Text
                className={`text-[14px] ${
                  newMuscleGroup === opt.key
                    ? 'text-[#4D94FF] font-semibold'
                    : 'text-[#64748b]'
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">
          器具
        </Text>
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onEquipmentChange(opt.key)}
              className={`px-2.5 py-1 rounded-full border ${
                newEquipment === opt.key
                  ? 'bg-[#E6F2FF] border-[#4D94FF]'
                  : 'border-[#e2e8f0]'
              }`}
            >
              <Text
                className={`text-[14px] ${
                  newEquipment === opt.key
                    ? 'text-[#4D94FF] font-semibold'
                    : 'text-[#64748b]'
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={onSubmit}
          className="py-2.5 bg-[#4D94FF] rounded-lg items-center"
        >
          <Text className="text-[15px] font-semibold text-white">作成して追加</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} className="items-center mt-2">
          <Text className="text-[15px] text-[#64748b]">キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

export const ExercisePickerScreen: React.FC = () => {
  const navigation = useNavigation<PickerNavProp>();
  const route = useRoute<PickerRouteProp>();
  const session = useWorkoutSession();
  // SafeArea 対応: ノッチ・ダイナミックアイランド対応
  const insets = useSafeAreaInsets();
  const { query, setQuery, selectedCategory, setSelectedCategory, sections } = useExerciseSearch();

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

  // T039: カスタム種目作成/編集フォーム
  const [isCreating, setIsCreating] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup>('chest');
  const [newEquipment, setNewEquipment] = useState<Equipment>('barbell');

  // T039: インライン編集
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMuscleGroup, setEditMuscleGroup] = useState<MuscleGroup>('chest');
  const [editEquipment, setEditEquipment] = useState<Equipment>('barbell');

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
        await session.addExercise(exercise.id);
        navigation.goBack();
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

  /** お気に入りトグル */
  const handleToggleFavorite = useCallback(async (exerciseId: string) => {
    await ExerciseRepository.toggleFavorite(exerciseId);
  }, []);

  /** T039: カスタム種目を作成する */
  const handleCreateCustom = useCallback(async () => {
    if (!newExerciseName.trim()) return;

    try {
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

  /** T039: 種目編集を開始する */
  const handleStartEdit = useCallback((exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setEditName(exercise.name);
    setEditMuscleGroup(exercise.muscleGroup);
    setEditEquipment(exercise.equipment);
  }, []);

  /** T039: 種目編集を保存する */
  const handleSaveEdit = useCallback(async () => {
    if (!editingExerciseId || !editName.trim()) return;
    try {
      await ExerciseRepository.update(editingExerciseId, {
        name: editName.trim(),
        muscle_group: editMuscleGroup,
        equipment: editEquipment,
      });
      setEditingExerciseId(null);
    } catch {
      showErrorToast('種目の更新に失敗しました');
    }
  }, [editingExerciseId, editName, editMuscleGroup, editEquipment]);

  /** 閉じる */
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const sectionData = sections.map((section) => ({
    title: section.title,
    data: section.data,
  }));

  return (
    <View className="flex-1 bg-white">
      {/* ページヘッダー（通常pushナビゲーション） */}
      <View
        className="flex-row items-center px-4 pb-3 border-b border-[#e2e8f0]"
        style={{ paddingTop: insets.top + 12 }}
      >
        <TouchableOpacity onPress={handleClose} className="w-8 h-8 items-center justify-center">
          <Text className="text-[24px] text-[#475569]">{'‹'}</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[18px] font-bold text-[#334155]">種目を選択</Text>
        {/* T038: モード切替トグル（ヘッダー右） */}
        <View className="w-8" />
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
          <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
            <Text className="text-[15px] font-semibold text-[#334155]">{section.title}</Text>
            <Text className="text-[14px] text-[#64748b]">{section.data.length}件</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const isEditing = editingExerciseId === item.id;
          // Issue #116: 追加済み判定
          const isAdded = addedExerciseIds.has(item.id);

          return (
            <View>
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
                    <View className="px-2 py-[2px] rounded-lg bg-[#E6F2FF]">
                      <Text className="text-[13px] font-semibold text-[#3385FF]">
                        {getMuscleGroupLabel(item.muscleGroup)}
                      </Text>
                    </View>
                    <View className="px-2 py-[2px] rounded-lg bg-[#F1F3F5]">
                      <Text className="text-[15px] text-[#64748b]">
                        {getEquipmentLabel(item.equipment)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* アクションボタン群（コンポーネントに分離して complexity を削減） */}
                <ExerciseItemActions
                  isAdded={isAdded}
                  isCustom={item.isCustom}
                  isFavorite={item.isFavorite}
                  onStartEdit={() => handleStartEdit(item)}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                />
              </TouchableOpacity>

              {/* T039: インライン編集フォーム（コンポーネントに分離して complexity を削減） */}
              {isEditing && (
                <InlineEditForm
                  editName={editName}
                  editMuscleGroup={editMuscleGroup}
                  editEquipment={editEquipment}
                  onNameChange={setEditName}
                  onMuscleGroupChange={setEditMuscleGroup}
                  onEquipmentChange={setEditEquipment}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingExerciseId(null)}
                />
              )}
            </View>
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
    </View>
  );
};

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
