/**
 * ExerciseHistoryFullScreen - 種目履歴フルスクリーン画面
 * ワイヤーフレーム: screen-history-full セクション準拠
 *
 * T058: 統計サマリーセクション
 * T059: 重量推移チャート（react-native-gifted-charts BarChart）
 * T060: PR履歴 + 全履歴リスト
 */
import type { RouteProp } from '@react-navigation/native';
import { useNavigation,useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ActivityIndicator,Pressable, ScrollView, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Path, Polyline,Svg } from 'react-native-svg';

import type { RecordStackParamList } from '@/types';

import { useExerciseHistory } from '../hooks/useExerciseHistory';

/** 戻るアイコン */
function BackArrow() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2}>
      <Path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type RouteParams = RouteProp<RecordStackParamList, 'ExerciseHistory'>;

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
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NativeStackNavigationProp<RecordStackParamList>>();
  const { exerciseId, exerciseName } = route.params;

  // 種目履歴データ
  const { stats, weeklyData, prHistory, allHistory, loading } =
    useExerciseHistory(exerciseId);

  // チャートデータ変換
  const chartData = weeklyData.map((w) => ({
    value: w.averageWeight,
    label: w.weekLabel,
    frontColor: '#4D94FF',
  }));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4D94FF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* フルスクリーンヘッダー */}
      <View
        className="flex-row items-center justify-between px-4 pt-14 pb-3 bg-white"
        style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}
      >
        <Pressable onPress={() => navigation.goBack()} className="py-1">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <BackArrow />
            <Text className="text-sm text-text-primary">戻る</Text>
          </View>
        </Pressable>
        <Text className="text-base font-semibold" style={{ color: '#334155' }}>
          {exerciseName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-5">
          {/* === T058: 統計サマリー (6項目グリッド) === */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <StatCard label="最大重量" value={`${stats.maxWeight}`} unit="kg" />
            <StatCard label="最大ボリューム" value={`${stats.maxVolume.toLocaleString()}`} unit="kg" />
            <StatCard label="平均重量" value={`${stats.averageWeight}`} unit="kg" />
            <StatCard label="総トレ回数" value={`${stats.totalSessions}`} unit="回" />
            <StatCard label="総ボリューム" value={formatVolume(stats.totalVolume)} />
            <StatCard
              label="最終PR"
              value={
                stats.lastPRDate
                  ? format(new Date(stats.lastPRDate), 'M/d', { locale: ja })
                  : '-'
              }
            />
          </View>

          {/* === T059: 重量推移チャート === */}
          {chartData.length > 0 ? (
            <View className="mt-6">
              <Text className="text-sm font-bold text-text-primary mb-4">
                過去3ヶ月の重量推移 (週平均)
              </Text>
              <View
                className="bg-white rounded-lg p-4"
                style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
              >
                <BarChart
                  data={chartData}
                  barWidth={20}
                  spacing={12}
                  roundedTop
                  roundedBottom
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor="#e2e8f0"
                  yAxisColor="#e2e8f0"
                  yAxisTextStyle={{ fontSize: 10, color: '#64748b' }}
                  xAxisLabelTextStyle={{ fontSize: 9, color: '#64748b' }}
                  noOfSections={5}
                  maxValue={
                    Math.ceil(
                      Math.max(...chartData.map((d) => d.value), 1) * 1.2
                    )
                  }
                  isAnimated
                />
              </View>
            </View>
          ) : null}

          {/* === T060: PR履歴 === */}
          {prHistory.length > 0 ? (
            <View className="mt-6">
              <Text className="text-sm font-bold text-text-primary mb-3">
                PR (自己ベスト) 履歴
              </Text>
              {prHistory.map((pr, idx) => (
                <View
                  key={idx}
                  className="bg-white rounded-sm p-3 mb-2 flex-row justify-between items-center"
                  style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                >
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: '#334155' }}>
                      {PR_TYPE_LABELS[pr.prType] ?? pr.prType}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-1">
                      {format(new Date(pr.achievedAt), 'yyyy-MM-dd')}
                    </Text>
                  </View>
                  <Text className="text-base font-bold" style={{ color: '#334155' }}>
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
                style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
              >
                {/* 日付行 */}
                <View className="flex-row items-center mb-2">
                  <Text className="text-[13px] text-text-primary">
                    {formatRelativeDate(session.completedAt)}
                  </Text>
                  {session.hasPR ? (
                    <View
                      className="ml-2 px-1.5 py-0.5 rounded-sm"
                      style={{ backgroundColor: '#E6F2FF' }}
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
function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View
      className="bg-white rounded-sm p-3"
      style={{
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '31%',
        minWidth: 100,
      }}
    >
      <Text style={{ fontSize: 11, color: '#64748b' }}>{label}</Text>
      <View className="flex-row items-end mt-1">
        <Text className="text-lg font-bold" style={{ color: '#334155' }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs ml-0.5" style={{ color: '#64748b' }}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
