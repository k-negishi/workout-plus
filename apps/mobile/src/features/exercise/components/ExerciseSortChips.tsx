/**
 * 種目選択画面のソート順チップ（セレクター）コンポーネント
 *
 * 4つのソートオプション（名前順・部位別・追加日順・よく使う順）を
 * 水平スクロール可能なチップ形式で表示する。
 * Constitution 原則 II（引き算のデザイン）に従い最小限の視覚的存在感で実装する。
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ExerciseSortOrder } from '@/types';

type SortChipOption = {
  key: ExerciseSortOrder;
  label: string;
};

/** ソートオプション定義 */
const SORT_OPTIONS: SortChipOption[] = [
  { key: 'name', label: '名前順' },
  { key: 'muscle', label: '部位別' },
  { key: 'date', label: '追加日順' },
  { key: 'frequency', label: 'よく使う順' },
];

type ExerciseSortChipsProps = {
  /** 現在選択中のソート順 */
  sortOrder: ExerciseSortOrder;
  /** ソート順変更時のコールバック */
  onSortChange: (order: ExerciseSortOrder) => void;
};

/**
 * ソートチップセレクターコンポーネント
 *
 * アクティブなチップには testID に `-active` サフィックスを付与し、
 * テストでアクティブ状態を識別できるようにする。
 */
export const ExerciseSortChips: React.FC<ExerciseSortChipsProps> = ({
  sortOrder,
  onSortChange,
}) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SORT_OPTIONS.map((option) => {
          const isActive = sortOrder === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSortChange(option.key)}
              testID={isActive ? `sort-chip-${option.key}-active` : `sort-chip-${option.key}`}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  scrollContent: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    height: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // アクティブ状態: Constitution カラーシステム準拠
  chipActive: {
    backgroundColor: '#E6F2FF',
    borderColor: '#4D94FF',
  },
  chipInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 13,
  },
  chipTextActive: {
    color: '#4D94FF',
    fontWeight: '600',
  },
  chipTextInactive: {
    color: '#64748b',
    fontWeight: '400',
  },
});
