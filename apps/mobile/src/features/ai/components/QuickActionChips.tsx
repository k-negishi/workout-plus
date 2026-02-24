/**
 * QuickActionChips コンポーネント
 *
 * 横スクロール可能な pill 型チップ列。
 * ユーザーが1タップで定型プロンプトを送信できる。
 * disabled 時はグレーアウトされ、タップが無効になる。
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

import type { QuickAction } from '../types/index';

type QuickActionChipsProps = {
  /** 表示するクイックアクション一覧 */
  actions: QuickAction[];
  /** チップタップ時のコールバック */
  onPress: (action: QuickAction) => void;
  /** true にすると全チップが無効化されグレーアウトする */
  disabled: boolean;
};

/**
 * 有効時のチップスタイル（青系）
 * pill 形状: borderRadius: 20
 */
const CHIP_ACTIVE_STYLE = {
  backgroundColor: '#E6F2FF',
  borderColor: '#4D94FF',
  borderWidth: 1,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 14,
  marginRight: 8,
};

/**
 * 無効時のチップスタイル（グレー系）
 */
const CHIP_DISABLED_STYLE = {
  backgroundColor: '#F1F5F9',
  borderColor: '#CBD5E1',
  borderWidth: 1,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 14,
  marginRight: 8,
};

const LABEL_ACTIVE_STYLE = {
  color: '#4D94FF' as const,
  fontSize: 13,
  fontWeight: '500' as const,
};

const LABEL_DISABLED_STYLE = {
  color: '#94A3B8' as const,
  fontSize: 13,
  fontWeight: '500' as const,
};

/**
 * クイックアクションチップ一覧
 *
 * ScrollView を横方向にすることで、チップが多い場合もスクロール対応できる。
 * TouchableOpacity の disabled prop で入力自体を無効化し、
 * 見た目はスタイル切り替えでグレーアウトを表現する。
 */
export function QuickActionChips({ actions, onPress, disabled }: QuickActionChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          testID={`quick-action-chip-${action.id}`}
          onPress={() => onPress(action)}
          disabled={disabled}
          style={disabled ? CHIP_DISABLED_STYLE : CHIP_ACTIVE_STYLE}
          activeOpacity={0.7}
        >
          <Text
            testID={`quick-action-label-${action.id}`}
            style={disabled ? LABEL_DISABLED_STYLE : LABEL_ACTIVE_STYLE}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
