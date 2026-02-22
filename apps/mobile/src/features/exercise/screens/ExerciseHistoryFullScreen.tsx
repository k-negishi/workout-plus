/**
 * ExerciseHistoryFullScreen - 種目履歴フルスクリーン画面
 * ワイヤーフレーム: screen-history-full セクション準拠
 *
 * T058: 統計サマリーセクション
 * T059: 重量推移チャート（react-native-gifted-charts BarChart）
 * T060: PR履歴 + 全履歴リスト
 */
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

import { colors } from '@/shared/constants/colors';

import { useExerciseHistory } from '../hooks/useExerciseHistory';

/** 戻るアイコン */
function BackArrow() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth={2}>
      <Path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * HomeStack / CalendarStack / RecordStack の3スタックで共通使用するため、
 * route params はスタック固有の ParamList に依存しないよう inline で定義する。
 * goBack() のみ使用するため navigation 型は ParamListBase で十分。
 */
type ExerciseHistoryRoute = RouteProp<
  { ExerciseHistory: { exerciseId: string; exerciseName: string } },
  'ExerciseHistory'
>;

/** PR種別の日本語ラベル */
const PR_TYPE_LABELS: Record<string, string> = {
  max_weight: '最大重量 (1RM推定)',
  max_volume: '最大ボリューム (1セッション)',
  max_reps: '最大レップス',
};

/** PR値のフォーマット */
function formatPRValue(prType: string, value: number): string {
  switch (prType) {
    case 'max_weight':
      return `${value}kg`;
    case 'max_volume':
      return `${value.toLocaleString()}kg`;
    case 'max_reps':
      return `${value}回`;
    default:
      return `${value}`;
  }
}

/** 重量を表示用にフォーマット */
function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toLocaleString()}kg`;
}

/** 日付を相対表示 */
function formatRelativeDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = format(date, 'yyyy-MM-dd');

  if (diffDays === 0) return `${dateStr} (今日)`;
  if (diffDays === 1) return `${dateStr} (昨日)`;
  return `${dateStr} (${diffDays}日前)`;
}

export function ExerciseHistoryFullScreen() {
  // goBack() のみ使用するため ParamListBase で十分（スタック非依存）
  const route = useRoute<ExerciseHistoryRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { exerciseId, exerciseName } = route.params;
  // SafeArea 対応: ノッチ・ダイナミックアイランド対応
  const insets = useSafeAreaInsets();

  // 種目履歴データ
  const { stats, weeklyData, prHistory, allHistory, loading } = useExerciseHistory(exerciseId);

  // チャートデータ変換
  const chartData = weeklyData.map((w) => ({
    value: w.averageWeight,
    label: w.weekLabel,
    frontColor: colors.primary,
  }));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* フルスクリーンヘッダー */}
      <View
        className="flex-row items-center justify-between px-4 pb-3 bg-white"
        style={{ paddingTop: insets.top + 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable onPress={() => navigation.goBack()} className="py-1">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <BackArrow />
            <Text className="text-sm text-text-primary">戻る</Text>
          </View>
        </Pressable>
        <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
          {exerciseName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-5">
          {/* === T058: 統計サマリー (6項目グリッド) === */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <StatCard label="最大重量" value={`${stats.maxWeight}`} unit="kg" />
            <StatCard
              label="最大ボリューム"
              value={`${stats.maxVolume.toLocaleString()}`}
              unit="kg"
            />
            <StatCard label="平均重量" value={`${stats.averageWeight}`} unit="kg" />
            {/* 「総トレ回数」→「総セット数」に変更 (#113) */}
            <StatCard label="総セット数" value={`${stats.totalSets}`} unit="セット" />
            <StatCard label="総ボリューム" value={formatVolume(stats.totalVolume)} />
            {/* 「最終PR」→「最高RM」に変更: Epley式による推定1RMを表示 (#114) */}
            {stats.maxEstimated1RM > 0 ? (
              <StatCard
                label="最高RM"
                value={`${Math.round(stats.maxEstimated1RM)}`}
                unit="kg"
              />
            ) : (
              <StatCard label="最高RM" value="-" />
            )}
          </View>

          {/* === T059: 重量推移チャート === */}
          {chartData.length > 0 ? (
            <View className="mt-6">
              <Text className="text-sm font-bold text-text-primary mb-4">
                過去3ヶ月の重量推移 (週平均)
              </Text>
              <View
                className="bg-white rounded-lg p-4"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                <BarChart
                  data={chartData}
                  barWidth={20}
                  spacing={12}
                  roundedTop
                  roundedBottom
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor={colors.border}
                  yAxisColor={colors.border}
                  yAxisTextStyle={{ fontSize: 10, color: colors.textSecondary }}
                  xAxisLabelTextStyle={{ fontSize: 9, color: colors.textSecondary }}
                  noOfSections={5}
                  maxValue={Math.ceil(Math.max(...chartData.map((d) => d.value), 1) * 1.2)}
                  isAnimated
                />
              </View>
            </View>
          ) : null}

          {/* === T060: PR履歴 === */}
          {prHistory.length > 0 ? (
            <View className="mt-6">
              <Text className="text-sm font-bold text-text-primary mb-3">PR (自己ベスト) 履歴</Text>
              {prHistory.map((pr, idx) => (
                <View
                  key={idx}
                  className="bg-white rounded-sm p-3 mb-2 flex-row justify-between items-center"
                  style={{ borderWidth: 1, borderColor: colors.border }}
                >
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      {PR_TYPE_LABELS[pr.prType] ?? pr.prType}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-1">
                      {format(new Date(pr.achievedAt), 'yyyy-MM-dd')}
                    </Text>
                  </View>
                  <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                    {formatPRValue(pr.prType, pr.value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* === T060: 全履歴リスト === */}
          <View className="mt-6 mb-20">
            <Text className="text-sm font-bold text-text-primary mb-3">
              全履歴 ({stats.totalSessions}回)
            </Text>
            {allHistory.map((session) => (
              <View
                key={session.workoutId}
                className="bg-white rounded-sm p-3 mb-3"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                {/* 日付行 */}
                <View className="flex-row items-center mb-2">
                  <Text className="text-[13px] text-text-primary">
                    {formatRelativeDate(session.completedAt)}
                  </Text>
                  {session.hasPR ? (
                    <View
                      className="ml-2 px-1.5 py-0.5 rounded-sm"
                      style={{ backgroundColor: colors.primaryBg }}
                    >
                      <Text className="text-primary" style={{ fontSize: 10, fontWeight: '700' }}>
                        PR
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* セット詳細 */}
                <View style={{ gap: 4 }}>
                  {session.sets.map((set) => (
                    <Text key={set.setNumber} className="text-sm text-text-secondary">
                      {set.weight ?? '-'}kg × {set.reps ?? '-'}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** 統計サマリー個別カード */
function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View
      className="bg-white rounded-sm p-3"
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        width: '31%',
        minWidth: 100,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
      <View className="flex-row items-end mt-1">
        <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs ml-0.5" style={{ color: colors.textSecondary }}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
