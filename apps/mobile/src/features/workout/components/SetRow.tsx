/**
 * セット行コンポーネント
 * セット番号、重量/レップ入力（NumericInput使用）、1RM表示、前回記録、コピー/削除ボタン
 */
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { NumericInput } from '@/shared/components/NumericInput';
import type { WorkoutSet } from '@/types';

import { calculate1RM } from '../utils/calculate1RM';

/** 前回記録の型（1セット分） */
export type PreviousSetData = {
  weight: number | null;
  reps: number | null;
};

/** 推定1RMを計算する純粋関数（nullの場合はnullを返す） */
function computeEstimated1RM(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null;
  return Math.round(calculate1RM(weight, reps));
}

/** 前回記録の表示ラベルを生成する純粋関数 */
function computePreviousLabel(previousSet: PreviousSetData | undefined): string | null {
  if (!previousSet || previousSet.weight == null || previousSet.reps == null) return null;
  return `前回: ${previousSet.weight}kg \u00D7 ${previousSet.reps}`;
}

export type SetRowProps = {
  /** セットデータ */
  set: WorkoutSet;
  /** 前回のセットデータ（存在しない場合はundefined） */
  previousSet?: PreviousSetData;
  /** 重量変更時のコールバック */
  onWeightChange: (setId: string, weight: number | null) => void;
  /** レップ数変更時のコールバック */
  onRepsChange: (setId: string, reps: number | null) => void;
  /** 前回記録コピー時のコールバック */
  onCopyPrevious: (setId: string) => void;
  /** セット削除時のコールバック */
  onDelete: (setId: string) => void;
};

export const SetRow: React.FC<SetRowProps> = ({
  set,
  previousSet,
  onWeightChange,
  onRepsChange,
  onCopyPrevious,
  onDelete,
}) => {
  /** 重量変更ハンドラー */
  const handleWeightChange = useCallback(
    (value: number | null) => {
      onWeightChange(set.id, value);
    },
    [set.id, onWeightChange],
  );

  /** レップ数変更ハンドラー */
  const handleRepsChange = useCallback(
    (value: number | null) => {
      onRepsChange(set.id, value);
    },
    [set.id, onRepsChange],
  );

  /** 推定1RM（モジュールレベル関数で計算） */
  const estimated1rm = computeEstimated1RM(set.weight, set.reps);

  /** 前回記録の表示ラベル（モジュールレベル関数で生成） */
  const previousLabel = computePreviousLabel(previousSet);

  return (
    <View>
      {/* 前回記録のインライン表示 */}
      {previousLabel && (
        <View className="pl-9 py-[2px]">
          <TouchableOpacity
            onPress={() => onCopyPrevious(set.id)}
            className="flex-row items-center gap-1"
            accessibilityLabel={`${previousLabel}をコピー`}
          >
            <Text className="text-[11px] text-[#64748b] font-normal">{previousLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* セット行本体 */}
      <View className="flex-row items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg">
        {/* セット番号 */}
        <View className="w-6 h-6 rounded-full bg-[#F1F3F5] items-center justify-center">
          <Text className="text-[12px] font-semibold text-[#64748b]">{set.setNumber}</Text>
        </View>

        {/* 入力エリア */}
        <View className="flex-1 flex-row items-center gap-1">
          {/* 重量入力（NumericInput: decimal） */}
          <NumericInput
            value={set.weight}
            onChangeValue={handleWeightChange}
            placeholder={previousSet?.weight?.toString() ?? '0'}
            unit="kg"
            inputType="decimal"
            min={0}
          />

          {/* 区切り */}
          <Text className="text-[14px] text-[#64748b] mx-[2px]">{'\u00D7'}</Text>

          {/* レップ数入力（NumericInput: integer） */}
          <NumericInput
            value={set.reps}
            onChangeValue={handleRepsChange}
            placeholder={previousSet?.reps?.toString() ?? '0'}
            unit="reps"
            inputType="integer"
            min={0}
          />
        </View>

        {/* 推定1RM表示 */}
        {estimated1rm != null && (
          <Text className="text-[11px] text-[#64748b] whitespace-nowrap">1RM {estimated1rm}</Text>
        )}

        {/* 削除ボタン */}
        <TouchableOpacity
          onPress={() => onDelete(set.id)}
          className="w-5 h-5 items-center justify-center ml-auto opacity-40"
          accessibilityLabel={`セット${set.setNumber}を削除`}
        >
          <Text className="text-[14px] text-[#64748b]">{'\u00D7'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
