/**
 * 種目ブロックコンポーネント
 * 種目名、前回セットバッジ、セットリスト、セット追加ボタンを含む
 */
import { format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Exercise, WorkoutSet } from '@/types';

import { type PreviousRecord } from '../hooks/usePreviousRecord';
import { type PreviousSetData, SetRow } from './SetRow';

export type ExerciseBlockProps = {
  /** 種目マスタ情報 */
  exercise: Exercise;
  /** ワークアウト内種目ID */
  workoutExerciseId: string;
  /** 現在のセットリスト */
  sets: WorkoutSet[];
  /** 前回記録 */
  previousRecord: PreviousRecord | null;
  /** 種目メモ */
  memo: string | null;
  /** セットの重量変更 */
  onWeightChange: (setId: string, weight: number | null) => void;
  /** セットのレップ数変更 */
  onRepsChange: (setId: string, reps: number | null) => void;
  /** 前回記録を1セットにコピー */
  onCopyPreviousSet: (setId: string, previousSet: PreviousSetData) => void;
  /** 前回記録を全セットにコピー */
  onCopyAllPrevious: () => void;
  /** セットを削除 */
  onDeleteSet: (setId: string) => void;
  /** セットを追加 */
  onAddSet: () => void;
  /** 種目名タップ（種目履歴へ遷移） */
  onExerciseNamePress: (exerciseId: string) => void;
  /** メモ変更 */
  onMemoChange?: (memo: string) => void;
};

/** 部位の日本語ラベル */
const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  biceps: '二頭',
  triceps: '三頭',
  abs: '腹',
};

export const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  exercise,
  workoutExerciseId: _workoutExerciseId,
  sets,
  previousRecord,
  memo,
  onWeightChange,
  onRepsChange,
  onCopyPreviousSet,
  onCopyAllPrevious,
  onDeleteSet,
  onAddSet,
  onExerciseNamePress,
  onMemoChange,
}) => {
  /** 前回記録のバッジテキスト */
  const previousBadgeText = useMemo(() => {
    if (!previousRecord) return null;
    const dateStr = format(previousRecord.workoutDate, 'M/d');
    return `前回: ${previousRecord.sets.length}セット (${dateStr})`;
  }, [previousRecord]);

  /** セット行の前回記録コピーハンドラー */
  const handleCopyPreviousSet = useCallback(
    (setId: string) => {
      if (!previousRecord) return;
      const currentSet = sets.find((s) => s.id === setId);
      if (!currentSet) return;
      const prevSet = previousRecord.sets[currentSet.setNumber - 1];
      if (prevSet) {
        onCopyPreviousSet(setId, {
          weight: prevSet.weight,
          reps: prevSet.reps,
        });
      }
    },
    [previousRecord, sets, onCopyPreviousSet]
  );

  /** 各セットに対応する前回データを取得 */
  const getPreviousSetData = useCallback(
    (setNumber: number): PreviousSetData | undefined => {
      if (!previousRecord) return undefined;
      const prevSet = previousRecord.sets[setNumber - 1];
      if (!prevSet) return undefined;
      return {
        weight: prevSet.weight,
        reps: prevSet.reps,
      };
    },
    [previousRecord]
  );

  const muscleLabel = MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup;

  return (
    <View className="px-5 py-3 border-b-[8px] border-[#F1F3F5]">
      {/* 種目ヘッダー */}
      <View className="flex-row justify-between items-start mb-1">
        <TouchableOpacity onPress={() => onExerciseNamePress(exercise.id)}>
          <Text className="text-[16px] font-semibold text-[#4D94FF]">
            {exercise.name}
          </Text>
          <Text className="text-[12px] text-[#64748b] mt-[2px]">
            {muscleLabel}
          </Text>
        </TouchableOpacity>

        {/* 前回記録バッジ + 一括コピー */}
        {previousBadgeText && (
          <TouchableOpacity
            onPress={onCopyAllPrevious}
            className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F3F5]"
            accessibilityLabel="前回の全セットをコピー"
          >
            <Text className="text-[11px] text-[#64748b]">
              {previousBadgeText}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* セットリスト */}
      <View className="gap-[2px]">
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <SetRow
              set={item}
              previousSet={getPreviousSetData(item.setNumber)}
              onWeightChange={onWeightChange}
              onRepsChange={onRepsChange}
              onCopyPrevious={handleCopyPreviousSet}
              onDelete={onDeleteSet}
            />
          )}
        />
      </View>

      {/* セット追加ボタン */}
      <TouchableOpacity
        onPress={onAddSet}
        className="w-full mt-2 py-[10px] border border-dashed border-[#4D94FF] rounded-lg bg-[#E6F2FF] items-center"
        accessibilityLabel="セットを追加"
      >
        <Text className="text-[13px] font-semibold text-[#4D94FF]">
          + セットを追加
        </Text>
      </TouchableOpacity>

      {/* 種目メモ */}
      <View className="flex-row items-center mt-2 gap-2">
        <Text className="text-[12px] text-[#64748b]">{'\u270E'}</Text>
        <TextInput
          className="flex-1 text-[13px] text-[#475569] py-1"
          placeholder="メモ（フォーム、体感など）"
          placeholderTextColor="#94a3b8"
          value={memo ?? ''}
          onChangeText={onMemoChange}
        />
      </View>
    </View>
  );
};
