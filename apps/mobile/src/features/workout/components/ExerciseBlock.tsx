/**
 * 種目ブロックコンポーネント
 * 種目名、前回セットバッジ（コピーアイコン付き）、セットリスト、セット追加ボタンを含む
 */
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Exercise, WorkoutSet } from '@/types';

import { type PreviousRecord } from '../hooks/usePreviousRecord';
import { SetRow } from './SetRow';

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
  /** 種目を削除 */
  onDeleteExercise?: () => void;
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
  onCopyAllPrevious,
  onDeleteSet,
  onAddSet,
  onExerciseNamePress,
  onMemoChange,
  onDeleteExercise,
}) => {
  /** 前回記録のバッジテキスト */
  const previousBadgeText = useMemo(() => {
    if (!previousRecord) return null;
    const dateStr = format(previousRecord.workoutDate, 'M/d');
    return `前回: ${previousRecord.sets.length}セット (${dateStr})`;
  }, [previousRecord]);

  const muscleLabel = MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup;

  return (
    <View className="px-5 py-3 border-b-[8px] border-[#F1F3F5]">
      {/* 種目ヘッダー */}
      <View className="flex-row justify-between items-start mb-1">
        <TouchableOpacity onPress={() => onExerciseNamePress(exercise.id)}>
          <Text className="text-[18px] font-semibold text-[#4D94FF]">{exercise.name}</Text>
          <Text className="text-[14px] text-[#64748b] mt-[2px]">{muscleLabel}</Text>
        </TouchableOpacity>

        {/* ヘッダー右エリア: 削除ボタン + コピーバッジ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={onDeleteExercise}
            accessibilityLabel={`${exercise.name}を削除`}
            style={{ padding: 4 }}
          >
            <Ionicons name="trash-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
          {previousBadgeText && (
            <TouchableOpacity
              onPress={onCopyAllPrevious}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: '#F1F3F5',
              }}
              accessibilityLabel="前回の全セットをコピー"
            >
              <Text className="text-[13px] text-[#64748b]">{previousBadgeText}</Text>
              <Ionicons name="copy-outline" size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
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
              onWeightChange={onWeightChange}
              onRepsChange={onRepsChange}
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
        <Text className="text-[15px] font-semibold text-[#4D94FF]">+ セットを追加</Text>
      </TouchableOpacity>

      {/* 種目メモ */}
      <View className="flex-row items-center mt-2 gap-2">
        <Text className="text-[14px] text-[#64748b]">{'\u270E'}</Text>
        <TextInput
          className="flex-1 text-[15px] text-[#475569] py-1"
          placeholder="メモ（フォーム、体感など）"
          placeholderTextColor="#94a3b8"
          value={memo ?? ''}
          onChangeText={onMemoChange}
        />
      </View>
    </View>
  );
};
