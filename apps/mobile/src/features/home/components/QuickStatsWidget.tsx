/**
 * QuickStatsWidget - ダッシュボード統計ウィジェット（案Aレイアウト）
 *
 * 今月・今週それぞれ「ワークアウト / 種目数 / セット数」を
 * 2つのカードに横3列で表示する。
 * Issue #130: 月間ボリューム廃止 → 種目数追加
 */
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';

type QuickStatsWidgetProps = {
  /** 今月のワークアウト回数 */
  monthlyWorkouts: number;
  /** 今月の総種目数（重複カウントあり） */
  monthlyExerciseCount: number;
  /** 今月の総セット数 */
  monthlySetCount: number;
  /** 今週のワークアウト回数 */
  weeklyWorkouts: number;
  /** 今週の総種目数（重複カウントあり） */
  weeklyExerciseCount: number;
  /** 今週の総セット数 */
  weeklySetCount: number;
};

/**
 * 今月/今週の統計を3カラムで表示するカード。
 * ラベルと値を縦積みにして数値の視認性を高める。
 */
function StatCard({
  period,
  workouts,
  workoutsTestId,
  exerciseCount,
  exerciseTestId,
  setCount,
  setTestId,
}: {
  period: string;
  workouts: number;
  workoutsTestId: string;
  exerciseCount: number;
  exerciseTestId: string;
  setCount: number;
  setTestId: string;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      {/* 期間ラベル */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.primary,
          marginBottom: 12,
        }}
      >
        {period}
      </Text>

      {/* 3カラム統計行 */}
      <View style={{ flexDirection: 'row' }}>
        {/* ワークアウト */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            testID={workoutsTestId}
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {workouts}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>ワークアウト</Text>
        </View>

        {/* 縦区切り線 */}
        <View
          style={{
            width: 1,
            backgroundColor: colors.border,
            marginVertical: 4,
          }}
        />

        {/* 種目数 */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            testID={exerciseTestId}
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {exerciseCount}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>種目</Text>
        </View>

        {/* 縦区切り線 */}
        <View
          style={{
            width: 1,
            backgroundColor: colors.border,
            marginVertical: 4,
          }}
        />

        {/* セット数 */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            testID={setTestId}
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {setCount}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>セット</Text>
        </View>
      </View>
    </View>
  );
}

export function QuickStatsWidget({
  monthlyWorkouts,
  monthlyExerciseCount,
  monthlySetCount,
  weeklyWorkouts,
  weeklyExerciseCount,
  weeklySetCount,
}: QuickStatsWidgetProps) {
  return (
    <View>
      <StatCard
        period="今月"
        workouts={monthlyWorkouts}
        workoutsTestId="monthly-workouts-value"
        exerciseCount={monthlyExerciseCount}
        exerciseTestId="monthly-exercise-value"
        setCount={monthlySetCount}
        setTestId="monthly-set-value"
      />
      <StatCard
        period="今週"
        workouts={weeklyWorkouts}
        workoutsTestId="weekly-workouts-value"
        exerciseCount={weeklyExerciseCount}
        exerciseTestId="weekly-exercise-value"
        setCount={weeklySetCount}
        setTestId="weekly-set-value"
      />
    </View>
  );
}
