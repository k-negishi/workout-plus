/**
 * 種目ブロックコンポーネント（Issue #138 前回セットインラインチップ形式）
 * バッジ形式を廃止し、前回の各セット内容（kg×rep）を常時インライン表示に変更
 *
 * Issue #146: FlatList → map に置き換えてちらつきを修正
 * scrollEnabled={false} の FlatList は ScrollView 内で再レンダリング時にちらつく原因になる。
 * セット数は通常 10 以下と少ないため、仮想化のオーバーヘッドを避けて map で直接レンダリングする。
 */
import { format } from 'date-fns';
import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

/**
 * 丸数字（①〜⑳）。20を超えるセット数は "(N)" にフォールバック
 * ワークアウトのセット数は通常20以下のため、この範囲で十分
 */
const CIRCLED_NUMBERS = [
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
];

/** セット番号を丸数字文字列に変換する */
const getCircledNumber = (n: number): string => {
  if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1]!;
  return `(${n})`;
};

/** 前回チップのスタイル（控えめなグレー小テキスト） */
const chipTextStyle = {
  fontSize: 12,
  color: '#94a3b8',
} as const;

export const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  exercise,
  workoutExerciseId: _workoutExerciseId,
  sets,
  previousRecord,
  memo,
  onWeightChange,
  onRepsChange,
  onDeleteSet,
  onAddSet,
  onExerciseNamePress,
  onMemoChange,
  onDeleteExercise,
}) => {
  // Issue #147: ローカル state でメモを管理する
  // memo prop（DB から来る値）は初期値にのみ使用し、以降はローカル state で保持する
  // こうすることで再レンダリング時に memo prop が null に戻っても入力値がリセットされない
  const [localMemo, setLocalMemo] = React.useState(memo ?? '');

  /** 削除確認モーダルを表示してから onDeleteExercise を呼ぶ（Issue #148） */
  const handleDeleteExercise = () => {
    Alert.alert('この種目を削除しますか？', '入力済みのセットもすべて削除されます', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: onDeleteExercise },
    ]);
  };

  return (
    // カード外枠: 白背景・細ボーダー・角丸・内側パディング・下マージン
    <View className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-3">
      {/* 種目ヘッダー: 種目名（左）+ 前回チップ（中・右詰め）+ 削除ボタン（右端） */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        {/* 種目名（タップで種目履歴へ遷移）Issue #151: ハイパーリンクカラーに統一 */}
        <TouchableOpacity onPress={() => onExerciseNamePress(exercise.id)}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#4D94FF' }}>{exercise.name}</Text>
        </TouchableOpacity>

        {/* 前回記録チップ: flex:1 で残りスペースを占有し右詰め折り返し */}
        {previousRecord ? (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              gap: 4,
              paddingHorizontal: 8,
            }}
          >
            <Text style={chipTextStyle}>前回 {format(previousRecord.workoutDate, 'M/d')}</Text>
            {previousRecord.sets.map((set, index) => (
              <Text key={set.id} style={chipTextStyle}>
                {getCircledNumber(index + 1)} {set.weight ?? '-'}×{set.reps ?? '-'}
              </Text>
            ))}
          </View>
        ) : (
          // チップなしでも削除ボタンを右端に寄せるスペーサー
          <View style={{ flex: 1 }} />
        )}

        {/* 削除ボタン: Issue #148 確認モーダルを経由して削除 */}
        <TouchableOpacity
          onPress={handleDeleteExercise}
          accessibilityLabel={`${exercise.name}を削除`}
          style={{ padding: 4 }}
        >
          <Text style={{ fontSize: 16, color: '#64748b' }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* カラムヘッダー行: Set / kg / (x スペーサー) / rep / 1RM / (削除スペーサー) */}
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
        {/* rep: flex-1 でレップ数入力列に合わせる（Issue #134: 「回」→「rep」に変更） */}
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '600',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          rep
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

      {/* セットリスト: Issue #146 FlatList を map に置き換えてちらつきを修正
          セット数は通常10以下と少なく、仮想化の恩恵がないため map で直接レンダリングする */}
      <View testID="set-list-container" style={{ gap: 12 }}>
        {sets.map((item) => (
          <SetRow
            key={item.id}
            set={item}
            onWeightChange={onWeightChange}
            onRepsChange={onRepsChange}
            onDelete={onDeleteSet}
          />
        ))}
      </View>

      {/* 「+ セットを追加」: 背景・ボーダーなしのテキストリンク */}
      <TouchableOpacity
        onPress={onAddSet}
        style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}
        accessibilityLabel="セットを追加"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4D94FF' }}>+ セットを追加</Text>
      </TouchableOpacity>

      {/* 種目メモ: Issue #147 ローカル state で管理してリセットを防止 */}
      <View className="flex-row items-center mt-2 gap-2">
        <Text className="text-[14px] text-[#64748b]">{'\u270E'}</Text>
        <TextInput
          className="flex-1 text-[15px] text-[#475569] py-1"
          placeholder="メモ（フォーム、体感など）"
          placeholderTextColor="#94a3b8"
          value={localMemo}
          onChangeText={(text) => {
            // ローカル state を更新して表示に即時反映し、親にも通知する
            setLocalMemo(text);
            onMemoChange?.(text);
          }}
        />
      </View>
    </View>
  );
};
