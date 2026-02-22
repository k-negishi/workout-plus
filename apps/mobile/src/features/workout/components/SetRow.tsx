/**
 * セット行コンポーネント（Issue #121: NumericInput → TextInput 化）
 *
 * NumericInput（ステッパー付き）から素の TextInput に変更することで、
 * 入力操作をシンプルにし、行全体の枠線を取り除いて軽量なデザインにする。
 */
import React, { useCallback } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { WorkoutSet } from '@/types';

import { calculate1RM } from '../utils/calculate1RM';

/** 推定1RMを計算する純粋関数（nullの場合はnullを返す） */
function computeEstimated1RM(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null;
  return Math.round(calculate1RM(weight, reps));
}

/**
 * テキスト入力から数値に変換する純粋関数。
 *
 * 空文字・"-" はユーザーが「未入力」の意図であるため null を返す。
 * それ以外は parseFloat で変換し、NaN の場合も null を返す。
 */
function parseInputToNumber(text: string): number | null {
  if (text === '' || text === '-') return null;
  const parsed = parseFloat(text);
  return isNaN(parsed) ? null : parsed;
}

export type SetRowProps = {
  /** セットデータ */
  set: WorkoutSet;
  /** 重量変更時のコールバック */
  onWeightChange: (setId: string, weight: number | null) => void;
  /** レップ数変更時のコールバック */
  onRepsChange: (setId: string, reps: number | null) => void;
  /** セット削除時のコールバック */
  onDelete: (setId: string) => void;
};

export const SetRow: React.FC<SetRowProps> = ({ set, onWeightChange, onRepsChange, onDelete }) => {
  /** 重量テキスト変更ハンドラー：文字列 → number | null に変換して親へ渡す */
  const handleWeightChangeText = useCallback(
    (text: string) => {
      onWeightChange(set.id, parseInputToNumber(text));
    },
    [set.id, onWeightChange],
  );

  /** レップ数テキスト変更ハンドラー：文字列 → number | null に変換して親へ渡す */
  const handleRepsChangeText = useCallback(
    (text: string) => {
      onRepsChange(set.id, parseInputToNumber(text));
    },
    [set.id, onRepsChange],
  );

  /** 推定1RM（null なら "-" 表示） */
  const estimated1RM = computeEstimated1RM(set.weight, set.reps);

  return (
    <View>
      {/* 行本体: 枠線・背景・パディングを持たない軽量レイアウト */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* セット番号: 幅32・左揃えで視認性を確保 */}
        <Text
          style={{
            width: 32,
            fontSize: 14,
            color: '#64748b',
            textAlign: 'left',
          }}
        >
          {set.setNumber}
        </Text>

        {/* 重量入力（decimal-pad: 小数点入力を許可） */}
        <TextInput
          style={{
            flex: 1,
            backgroundColor: '#FAFBFC',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 8,
            paddingVertical: 8,
            fontSize: 15,
            fontWeight: '600',
            color: '#334155',
            textAlign: 'center',
          }}
          placeholder="-"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={set.weight != null ? String(set.weight) : ''}
          onChangeText={handleWeightChangeText}
        />

        {/* 区切り文字: "x"（乗算の意味を持つ小文字） */}
        <Text style={{ fontSize: 14, color: '#64748b' }}>x</Text>

        {/* レップ数入力（number-pad: 整数のみ） */}
        <TextInput
          style={{
            flex: 1,
            backgroundColor: '#FAFBFC',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 8,
            paddingVertical: 8,
            fontSize: 15,
            fontWeight: '600',
            color: '#334155',
            textAlign: 'center',
          }}
          placeholder="-"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          value={set.reps != null ? String(set.reps) : ''}
          onChangeText={handleRepsChangeText}
        />

        {/* 推定1RM: prefix "1RM" を廃止し数値のみ表示。未計算時は "-" */}
        <Text
          style={{
            width: 48,
            fontSize: 13,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          {estimated1RM != null ? String(estimated1RM) : '-'}
        </Text>

        {/* 削除ボタン: ✕（U+2715）, 小さく控えめに */}
        <TouchableOpacity
          onPress={() => onDelete(set.id)}
          style={{
            width: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.4,
          }}
          accessibilityLabel={`セット${set.setNumber}を削除`}
        >
          <Text style={{ fontSize: 12, color: '#64748b' }}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
