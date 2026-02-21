/**
 * 数値入力コンポーネント
 * 重量（decimal-pad）とレップ数（number-pad）に対応
 * value は number | null で管理し、文字列変換は内部で行う
 */
import React, { useCallback, useState } from 'react';
import {
  type StyleProp,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { fontSize, fontWeight } from '@/shared/constants/typography';

type NumericInputProps = {
  /** 入力値（null は未入力状態） */
  value: number | null;
  /** 値変更コールバック */
  onChangeValue: (value: number | null) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 単位ラベル（'kg', 'reps' 等） */
  unit?: string;
  /** 入力種別: decimal は小数対応、integer は整数のみ */
  inputType?: 'decimal' | 'integer';
  /** 最小値 */
  min?: number;
  /** 最大値 */
  max?: number;
  /** カスタムスタイル */
  style?: StyleProp<ViewStyle>;
};

export function NumericInput({
  value,
  onChangeValue,
  placeholder,
  unit,
  inputType = 'decimal',
  min,
  max,
  style,
}: NumericInputProps) {
  /** 内部的に文字列として管理（入力途中の "5." 等を保持するため） */
  const [textValue, setTextValue] = useState<string>(
    value != null ? String(value) : '',
  );

  /** 不正な文字を除去して値を反映 */
  const handleChangeText = useCallback(
    (text: string) => {
      let cleaned: string;

      if (inputType === 'decimal') {
        // 小数点1つまで許可
        cleaned = text.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) {
          cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
        }
      } else {
        // 整数のみ許可
        cleaned = text.replace(/[^0-9]/g, '');
      }

      setTextValue(cleaned);

      if (cleaned === '' || cleaned === '.') {
        onChangeValue(null);
        return;
      }

      const numValue = Number(cleaned);
      if (!isNaN(numValue)) {
        // min/max 範囲チェック
        if (min != null && numValue < min) return;
        if (max != null && numValue > max) return;
        onChangeValue(numValue);
      }
    },
    [inputType, onChangeValue, min, max],
  );

  /** フォーカスが外れた時に表示値を整える */
  const handleBlur = useCallback(() => {
    if (value != null) {
      setTextValue(String(value));
    } else {
      setTextValue('');
    }
  }, [value]);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <TextInput
        value={textValue}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        keyboardType={inputType === 'decimal' ? 'decimal-pad' : 'number-pad'}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        textAlign="center"
        selectTextOnFocus
        style={{
          width: 56,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: borderRadius.md,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: '#334155',
          backgroundColor: '#FAFBFC',
        }}
      />
      {unit && (
        <Text
          style={{
            marginLeft: 4,
            fontSize: fontSize.xs,
            color: colors.textSecondary,
          }}
        >
          {unit}
        </Text>
      )}
    </View>
  );
}
