/**
 * WeeklyGoalsWidget - 今週の目標進捗ウィジェット
 * ワイヤーフレーム: weekly-goals セクション（L530-641）準拠
 * 3カラムグリッド: ワークアウト数 / 総セット数 / 達成率 + プログレスバー
 */
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';

type WeeklyGoalsWidgetProps = {
  /** 今週のワークアウト数 */
  thisWeekWorkouts: number;
  /** 今週の総セット数（負荷量より実施内容を直接示すため変更） */
  thisWeekSets: number;
  /** 前週のワークアウト数（前週比計算用） */
  lastWeekWorkouts: number;
  /** 週の目標（デフォルト: 3） */
  targetWorkouts?: number;
};

/** 前週比のテキストを返す（+N or -N） */
function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return '±0';
}

export function WeeklyGoalsWidget({
  thisWeekWorkouts,
  thisWeekSets,
  lastWeekWorkouts,
  targetWorkouts = 3,
}: WeeklyGoalsWidgetProps) {
  // 達成率: 0〜100%
  const achievementRate = Math.min(Math.round((thisWeekWorkouts / targetWorkouts) * 100), 100);

  // 前週比
  const workoutDiff = thisWeekWorkouts - lastWeekWorkouts;

  // ステータスバッジのテキスト
  // 達成率 100% なら「達成」、それ以外は「順調」
  const statusText = achievementRate >= 100 ? '達成' : '順調';

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* ヘッダー行（WF L538-549） */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          今週の目標
        </Text>
        <View
          style={{
            backgroundColor: colors.primaryBg,
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.primary,
            }}
          >
            {statusText}
          </Text>
        </View>
      </View>

      {/* 3カラムグリッド（WF L579-607） */}
      <View
        testID="goals-grid"
        style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* セル1: ワークアウト数 */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {thisWeekWorkouts}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              fontWeight: '400',
            }}
          >
            ワークアウト
          </Text>
          {/* 前週比 */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              marginTop: 2,
              color: workoutDiff >= 0 ? colors.success : colors.error,
            }}
          >
            {formatDiff(workoutDiff)}
          </Text>
        </View>

        {/* セル2: 総セット数（負荷量より直感的に実施量が分かるため変更） */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {thisWeekSets}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              fontWeight: '400',
            }}
          >
            総セット数
          </Text>
        </View>

        {/* セル3: 達成率 */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {achievementRate}%
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              fontWeight: '400',
            }}
          >
            達成率
          </Text>
        </View>
      </View>

      {/* プログレスバー（WF L609-641） */}
      <View style={{ marginTop: 12 }}>
        {/* プログレスバーヘッダー */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
            }}
          >
            週間目標進捗
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.primary,
            }}
          >
            {achievementRate}%
          </Text>
        </View>

        {/* バー外枠 */}
        <View
          testID="progress-bar"
          style={{
            height: 8,
            backgroundColor: colors.neutralBg,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* バー塗り */}
          <View
            testID="progress-fill"
            style={{
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: 4,
              width: `${achievementRate}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}
