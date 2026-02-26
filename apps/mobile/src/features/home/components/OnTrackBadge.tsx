/**
 * OnTrackBadge - 「順調」状態バッジ
 *
 * 今週1回以上ワークアウトしていれば「順調」を表示する。
 * そうでなければ何も表示しない（null を返す）。
 */
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';

type OnTrackBadgeProps = {
  /** 今週のワークアウト回数 */
  weeklyWorkouts: number;
};

export function OnTrackBadge({ weeklyWorkouts }: OnTrackBadgeProps) {
  if (weeklyWorkouts < 1) {
    return null;
  }

  return (
    <View
      testID="on-track-badge"
      style={{
        backgroundColor: '#ECFDF5',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.success,
        }}
      >
        順調
      </Text>
    </View>
  );
}
