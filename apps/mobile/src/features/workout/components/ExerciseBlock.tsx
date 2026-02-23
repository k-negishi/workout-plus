/**
 * 種目ブロックコンポーネント（Issue #121 カードデザイン刷新）
 * カード外枠・カラムヘッダー・テキストリンクボタン・showPreviousRecord prop を追加
 */
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
  /**
   * 前回記録バッジを表示するか（デフォルト true）
   * false を渡すと previousRecord があっても非表示にする
   */
  showPreviousRecord?: boolean;
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
  showPreviousRecord = true,
}) => {
  /** 前回記録のバッジテキスト。showPreviousRecord=false の場合は生成しない */
  const previousBadgeText = useMemo(() => {
    if (!showPreviousRecord) return null;
    if (!previousRecord) return null;
    const dateStr = format(previousRecord.workoutDate, 'M/d');
    return `前回: ${previousRecord.sets.length}セット (${dateStr})`;
  }, [showPreviousRecord, previousRecord]);

  const muscleLabel = MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup;

  return (
    // カード外枠: 白背景・細ボーダー・角丸・内側パディング・下マージン
    <View className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-3">
      {/* 種目ヘッダー */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => onExerciseNamePress(exercise.id)}>
          {/* 種目名: 16px / #334155（ダークグレー）/ semibold */}
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>{exercise.name}</Text>
          {/* 部位ラベル: 変更なし */}
          <Text className="text-[14px] text-[#64748b] mt-[2px]">{muscleLabel}</Text>
        </TouchableOpacity>

        {/* ヘッダー右エリア: 削除ボタン + コピーバッジ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* 削除ボタン: アイコンからテキスト「✕」に変更（シンプル化） */}
          <TouchableOpacity
            onPress={onDeleteExercise}
            accessibilityLabel={`${exercise.name}を削除`}
            style={{ padding: 4 }}
          >
            <Text style={{ fontSize: 16, color: '#64748b' }}>✕</Text>
          </TouchableOpacity>
          {/* 前回記録バッジ: showPreviousRecord=false のとき非表示 */}
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
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* カラムヘッダー行: Set / kg / (x スペーサー) / 回 / 1RM / (削除スペーサー) */}
      <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 8, paddingBottom: 8 }}>
        {/* Set: セット番号列幅 32px */}
        <Text
          style={{
            width: 32,
            fontSize: 11,
            fontWeight: '600',
            color: '#64748b',
            textAlign: 'left',
          }}
        >
          Set
        </Text>
        {/* kg: flex-1 で重量入力列に合わせる */}
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '600',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          kg
        </Text>
        {/* ×記号のスペーサー: SetRow の区切り文字列幅に合わせて 16px */}
        <View style={{ width: 16 }} />
        {/* 回: flex-1 でレップ数入力列に合わせる */}
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '600',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          回
        </Text>
        {/* 1RM: 推定1RM表示列幅 48px */}
        <Text
          style={{
            width: 48,
            fontSize: 11,
            fontWeight: '600',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          1RM
        </Text>
        {/* 削除ボタン列のスペーサー: SetRow の削除ボタン幅 20px に合わせる */}
        <View style={{ width: 20 }} />
      </View>

      {/* セットリスト: gap を 12px に拡大してセット間の行間を広げる（Issue #128） */}
      <View testID="set-list-container" style={{ gap: 12 }}>
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

      {/* 「+ セットを追加」: 背景・ボーダーなしのテキストリンクに変更 */}
      <TouchableOpacity
        onPress={onAddSet}
        style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}
        accessibilityLabel="セットを追加"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4D94FF' }}>+ セットを追加</Text>
      </TouchableOpacity>

      {/* 種目メモ: 変更なし */}
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
