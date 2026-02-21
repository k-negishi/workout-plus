/**
 * T046: WorkoutEditScreen
 * 過去のワークアウトを編集する画面
 * セット値変更、セット追加/削除、種目追加/削除
 * 保存時にPR再計算（T047）、変更ありキャンセル時にDiscard確認（T048）
 */
import { type RouteProp,useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getDatabase } from '@/database/client';
import { PersonalRecordRepository } from '@/database/repositories/pr';
import { SetRepository } from '@/database/repositories/set';
import { showErrorToast, showSuccessToast } from '@/shared/components/Toast';
import type {
  Exercise,
  HomeStackParamList,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

import { DiscardDialog } from '../components/DiscardDialog';
import { calculate1RM } from '../utils/calculate1RM';

type EditNavProp = NativeStackNavigationProp<HomeStackParamList, 'WorkoutEdit'>;
type EditRouteProp = RouteProp<HomeStackParamList, 'WorkoutEdit'>;

/** 種目ブロックデータ */
type EditExerciseBlock = {
  workoutExercise: WorkoutExercise;
  exercise: Exercise | null;
  sets: WorkoutSet[];
};

export const WorkoutEditScreen: React.FC = () => {
  const navigation = useNavigation<EditNavProp>();
  const route = useRoute<EditRouteProp>();
  const { workoutId } = route.params;

  const [exerciseBlocks, setExerciseBlocks] = useState<EditExerciseBlock[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /** データを読み込む */
  useEffect(() => {
    const load = async () => {
      const db = await getDatabase();

      const weRows = await db.getAllAsync<{
        id: string;
        workout_id: string;
        exercise_id: string;
        display_order: number;
        memo: string | null;
        created_at: number;
      }>(
        'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
        [workoutId]
      );

      const blocks: EditExerciseBlock[] = [];
      for (const we of weRows) {
        const exRow = await db.getFirstAsync<{
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
          is_custom: 0 | 1;
          is_favorite: 0 | 1;
          created_at: number;
          updated_at: number;
        }>('SELECT * FROM exercises WHERE id = ?', [we.exercise_id]);

        const exercise: Exercise | null = exRow
          ? {
              id: exRow.id,
              name: exRow.name,
              muscleGroup: exRow.muscle_group as Exercise['muscleGroup'],
              equipment: exRow.equipment as Exercise['equipment'],
              isCustom: exRow.is_custom === 1,
              isFavorite: exRow.is_favorite === 1,
              createdAt: exRow.created_at,
              updatedAt: exRow.updated_at,
            }
          : null;

        const setRows = await db.getAllAsync<{
          id: string;
          workout_exercise_id: string;
          set_number: number;
          weight: number | null;
          reps: number | null;
          estimated_1rm: number | null;
          created_at: number;
          updated_at: number;
        }>(
          'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
          [we.id]
        );

        blocks.push({
          workoutExercise: {
            id: we.id,
            workoutId: we.workout_id,
            exerciseId: we.exercise_id,
            displayOrder: we.display_order,
            memo: we.memo,
            createdAt: we.created_at,
          },
          exercise,
          sets: setRows.map((s) => ({
            id: s.id,
            workoutExerciseId: s.workout_exercise_id,
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            estimated1rm: s.estimated_1rm,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          })),
        });
      }

      setExerciseBlocks(blocks);
    };
    void load();
  }, [workoutId]);

  /** セットの重量を変更する */
  const handleWeightChange = useCallback(
    (blockIdx: number, setIdx: number, text: string) => {
      const weight = text ? parseFloat(text) : null;
      setExerciseBlocks((prev) => {
        const next = [...prev];
        const block = { ...next[blockIdx]! };
        const sets = [...block.sets];
        const s = { ...sets[setIdx]! };
        s.weight = weight;
        s.estimated1rm =
          weight != null && s.reps != null && weight > 0 && s.reps > 0
            ? calculate1RM(weight, s.reps)
            : null;
        sets[setIdx] = s;
        block.sets = sets;
        next[blockIdx] = block;
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  /** セットのレップ数を変更する */
  const handleRepsChange = useCallback(
    (blockIdx: number, setIdx: number, text: string) => {
      const reps = text ? parseInt(text, 10) : null;
      setExerciseBlocks((prev) => {
        const next = [...prev];
        const block = { ...next[blockIdx]! };
        const sets = [...block.sets];
        const s = { ...sets[setIdx]! };
        s.reps = reps;
        s.estimated1rm =
          s.weight != null && reps != null && s.weight > 0 && reps > 0
            ? calculate1RM(s.weight, reps)
            : null;
        sets[setIdx] = s;
        block.sets = sets;
        next[blockIdx] = block;
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  /** セットを追加する */
  const handleAddSet = useCallback(
    async (blockIdx: number) => {
      const block = exerciseBlocks[blockIdx];
      if (!block) return;
      const nextNum = block.sets.length + 1;
      const setRow = await SetRepository.create({
        workout_exercise_id: block.workoutExercise.id,
        set_number: nextNum,
      });
      setExerciseBlocks((prev) => {
        const next = [...prev];
        const b = { ...next[blockIdx]! };
        b.sets = [
          ...b.sets,
          {
            id: setRow.id,
            workoutExerciseId: setRow.workout_exercise_id,
            setNumber: setRow.set_number,
            weight: setRow.weight,
            reps: setRow.reps,
            estimated1rm: setRow.estimated_1rm,
            createdAt: setRow.created_at,
            updatedAt: setRow.updated_at,
          },
        ];
        next[blockIdx] = b;
        return next;
      });
      setHasChanges(true);
    },
    [exerciseBlocks]
  );

  /** セットを削除する */
  const handleDeleteSet = useCallback(
    async (blockIdx: number, setIdx: number) => {
      const block = exerciseBlocks[blockIdx];
      if (!block) return;
      const set = block.sets[setIdx];
      if (!set) return;

      await SetRepository.delete(set.id);

      setExerciseBlocks((prev) => {
        const next = [...prev];
        const b = { ...next[blockIdx]! };
        b.sets = b.sets
          .filter((_, i) => i !== setIdx)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        next[blockIdx] = b;
        return next;
      });
      setHasChanges(true);
    },
    [exerciseBlocks]
  );

  /** 種目を削除する */
  const handleDeleteExercise = useCallback(
    async (blockIdx: number) => {
      const block = exerciseBlocks[blockIdx];
      if (!block) return;

      const db = await getDatabase();
      await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [
        block.workoutExercise.id,
      ]);

      setExerciseBlocks((prev) => prev.filter((_, i) => i !== blockIdx));
      setHasChanges(true);
    },
    [exerciseBlocks]
  );

  /** T047: 保存＋PR再計算 */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 各セットの変更をDBに反映
      for (const block of exerciseBlocks) {
        for (const set of block.sets) {
          await SetRepository.update(set.id, {
            weight: set.weight,
            reps: set.reps,
            set_number: set.setNumber,
          });
        }
      }

      // PR再計算
      const exerciseIds = new Set(
        exerciseBlocks.map((b) => b.workoutExercise.exerciseId)
      );
      for (const exerciseId of exerciseIds) {
        await PersonalRecordRepository.recalculateForExercise(exerciseId);
      }

      showSuccessToast('変更を保存しました');
      navigation.goBack();
    } catch {
      showErrorToast('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [exerciseBlocks, navigation]);

  /** キャンセル */
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

  /** 破棄確認 → 戻る */
  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    navigation.goBack();
  }, [navigation]);

  return (
    <View className="flex-1 bg-[#f9fafb]">
      {/* ヘッダー */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-[#e2e8f0]">
        <TouchableOpacity onPress={handleCancel}>
          <Text className="text-[15px] text-[#475569]">キャンセル</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[16px] font-semibold text-[#334155]">
          編集
        </Text>
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={isSaving}
          className="px-4 py-2 bg-[#10B981] rounded-lg"
        >
          <Text className="text-[15px] font-semibold text-white">
            {isSaving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 種目ブロック一覧 */}
        <View className="px-4 pt-2 pb-4">
          {exerciseBlocks.map((block, blockIdx) => (
            <View
              key={block.workoutExercise.id}
              className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-3"
            >
              {/* 種目ヘッダー */}
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[16px] font-semibold text-[#334155]">
                  {block.exercise?.name ?? '不明な種目'}
                </Text>
                <TouchableOpacity
                  onPress={() => void handleDeleteExercise(blockIdx)}
                  className="p-1"
                >
                  <Text className="text-[16px] text-[#64748b]">{'✕'}</Text>
                </TouchableOpacity>
              </View>

              {/* セットテーブルヘッダー */}
              <View className="flex-row gap-2 px-2 pb-2">
                <Text className="w-8 text-[11px] font-semibold text-[#64748b] text-left">
                  Set
                </Text>
                <Text className="flex-1 text-[11px] font-semibold text-[#64748b] text-center">
                  kg
                </Text>
                <Text className="w-4 text-[11px] text-[#64748b] text-center" />
                <Text className="flex-1 text-[11px] font-semibold text-[#64748b] text-center">
                  回
                </Text>
                <Text className="w-12 text-[11px] font-semibold text-[#64748b] text-center">
                  1RM
                </Text>
              </View>

              {/* セット一覧 */}
              <View className="gap-2">
                {block.sets.map((set, setIdx) => (
                  <View key={set.id} className="flex-row items-center gap-2">
                    {/* セット番号 */}
                    <Text className="w-8 text-[14px] text-[#64748b] text-left">
                      {set.setNumber}
                    </Text>
                    {/* 重量入力 */}
                    <TextInput
                      className="flex-1 bg-[#FAFBFC] border border-[#e2e8f0] rounded-lg py-2 text-[15px] font-semibold text-[#334155] text-center"
                      keyboardType="decimal-pad"
                      value={set.weight != null ? String(set.weight) : ''}
                      onChangeText={(text) => handleWeightChange(blockIdx, setIdx, text)}
                      placeholder="-"
                      placeholderTextColor="#94a3b8"
                    />
                    {/* x */}
                    <Text className="text-[14px] text-[#64748b]">x</Text>
                    {/* レップ数入力 */}
                    <TextInput
                      className="flex-1 bg-[#FAFBFC] border border-[#e2e8f0] rounded-lg py-2 text-[15px] font-semibold text-[#334155] text-center"
                      keyboardType="number-pad"
                      value={set.reps != null ? String(set.reps) : ''}
                      onChangeText={(text) => handleRepsChange(blockIdx, setIdx, text)}
                      placeholder="-"
                      placeholderTextColor="#94a3b8"
                    />
                    {/* 推定1RM */}
                    <Text className="w-12 text-[13px] text-[#64748b] text-center">
                      {set.estimated1rm != null ? Math.round(set.estimated1rm) : '-'}
                    </Text>
                    {/* 削除ボタン */}
                    <TouchableOpacity
                      onPress={() => void handleDeleteSet(blockIdx, setIdx)}
                      className="w-5 h-5 items-center justify-center"
                    >
                      <Text className="text-[12px] text-[#64748b] opacity-40">{'✕'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* セット追加ボタン */}
              <TouchableOpacity
                onPress={() => void handleAddSet(blockIdx)}
                className="mt-2 py-2"
              >
                <Text className="text-[14px] font-semibold text-[#4D94FF]">
                  + セットを追加
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 種目追加ボタン */}
        <TouchableOpacity
          className="mx-4 py-4 bg-white border border-[#e2e8f0] rounded-lg items-center"
        >
          <Text className="text-[15px] font-semibold text-[#4D94FF]">
            + 種目を追加
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* T048: 破棄確認ダイアログ */}
      <DiscardDialog
        visible={showDiscardDialog}
        onDiscard={handleDiscard}
        onCancel={() => setShowDiscardDialog(false)}
      />
    </View>
  );
};
