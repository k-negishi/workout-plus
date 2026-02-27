/**
 * セット行コンポーネント（Issue #121: NumericInput → TextInput 化）
 *
 * NumericInput（ステッパー付き）から素の TextInput に変更することで、
 * 入力操作をシンプルにし、行全体の枠線を取り除いて軽量なデザインにする。
 *
 * Issue #165: iOS 日本語入力（IME）対応
 * controlled TextInput（value prop）は iOS の IME marked text と競合するため、
 * ローカル state でテキストをバッファリングし、フィルタリング後の数値のみ親へ通知する。
 */
import React, { useCallback, useState } from 'react';
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
  /**
   * ローカルテキスト state（Issue #165: iOS IME 対応）
   *
   * value prop を親の set.weight/set.reps に直接紐づけると、
   * onChangeText → Zustand 更新 → re-render → value 再設定 のサイクルで
   * iOS の IME marked text がリセットされる。
   * ローカル state を挟むことで re-render が TextInput の表示値に影響しない。
   */
  const [weightText, setWeightText] = useState<string>(
    set.weight != null ? String(set.weight) : '',
  );
  const [repsText, setRepsText] = useState<string>(set.reps != null ? String(set.reps) : '');

  /**
   * 重量テキスト変更ハンドラー。
   *
   * 日本語 IME が混入させた文字を除去してからローカル state を更新し、
   * 有効な数値のみ親へ通知する。
   */
  const handleWeightChangeText = useCallback(
    (text: string) => {
      // 数値と小数点以外を除去（日本語文字・記号を排除）
      const filtered = text.replace(/[^0-9.]/g, '');
      // 小数点の重複を防ぐ（例: "6..5" → "6.5"）
      const parts = filtered.split('.');
      const cleaned = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : filtered;
      setWeightText(cleaned);
      onWeightChange(set.id, parseInputToNumber(cleaned));
    },
    [set.id, onWeightChange],
  );

  /**
   * 重量フィールドの blur ハンドラー。
   *
   * フォーカスを外したとき、親の set.weight に表示を正規化する。
   * ユーザーが途中まで入力した状態でフォーカスを外しても
   * 保存済みの値に戻ることを保証する。
   */
  const handleWeightBlur = useCallback(() => {
    setWeightText(set.weight != null ? String(set.weight) : '');
  }, [set.weight]);

  /**
   * レップ数テキスト変更ハンドラー。
   *
   * 整数のみ受け付ける（小数点・日本語文字を排除）。
   */
  const handleRepsChangeText = useCallback(
    (text: string) => {
      // 数字以外を除去（小数点も不要）
      const cleaned = text.replace(/[^0-9]/g, '');
      setRepsText(cleaned);
      onRepsChange(set.id, parseInputToNumber(cleaned));
    },
    [set.id, onRepsChange],
  );

  /** レップフィールドの blur ハンドラー。フォーカス離脱時に親の set.reps に戻す */
  const handleRepsBlur = useCallback(() => {
    setRepsText(set.reps != null ? String(set.reps) : '');
  }, [set.reps]);

  /** 推定1RM（null なら "-" 表示） */
  const estimated1RM = computeEstimated1RM(set.weight, set.reps);

  return (
    // 外枠: 上下に余白を追加してセット間の行間を広げる（Issue #128）
    <View testID="set-row-container" style={{ paddingVertical: 4 }}>
      {/* 行本体: 枠線・背景なしの軽量レイアウト */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* セット番号: 幅32・中央揃えでヘッダー "Set" と位置を一致させる */}
        <Text
          style={{
            width: 32,
            fontSize: 15,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          {set.setNumber}
        </Text>

        {/* 重量入力（decimal-pad: 小数点入力を許可）Issue #174: 幅縮小・フォント拡大 */}
        <TextInput
          testID="weight-input"
          style={{
            width: 72,
            backgroundColor: '#FAFBFC',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 8,
            paddingVertical: 8,
            fontSize: 16,
            fontWeight: '600',
            color: '#334155',
            textAlign: 'center',
          }}
          keyboardType="decimal-pad"
          value={weightText}
          onChangeText={handleWeightChangeText}
          onBlur={handleWeightBlur}
        />

        {/* 区切り文字: "x"（乗算の意味を持つ小文字）カラムヘッダーの16px スペーサーと幅を合わせる */}
        <Text style={{ width: 16, fontSize: 15, color: '#64748b', textAlign: 'center' }}>x</Text>

        {/* レップ数入力（number-pad: 整数のみ）Issue #174: 幅縮小・フォント拡大 */}
        <TextInput
          testID="reps-input"
          style={{
            width: 72,
            backgroundColor: '#FAFBFC',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 8,
            paddingVertical: 8,
            fontSize: 16,
            fontWeight: '600',
            color: '#334155',
            textAlign: 'center',
          }}
          keyboardType="number-pad"
          value={repsText}
          onChangeText={handleRepsChangeText}
          onBlur={handleRepsBlur}
        />

        {/* 推定1RM: 固定幅48でコンパクトに表示。未計算時は "-" */}
        <Text
          style={{
            width: 48,
            fontSize: 14,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          {estimated1RM != null ? String(estimated1RM) : '-'}
        </Text>

        {/* 削除ボタン: flex:1 で残りの横幅を占有し × を右端に配置する。
            タップ領域が広がり誤タップを防ぐ効果もある */}
        <TouchableOpacity
          onPress={() => onDelete(set.id)}
          style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'center',
            opacity: 0.4,
          }}
          accessibilityLabel={`セット${set.setNumber}を削除`}
        >
          <Text style={{ fontSize: 13, color: '#64748b' }}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
