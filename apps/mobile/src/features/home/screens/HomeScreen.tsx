/**
 * HomeScreen - ホームダッシュボード画面
 * ワイヤーフレーム: home-header + home-main セクション準拠
 * 時間帯別挨拶、StreakCard、最近のワークアウト3件、QuickStatsWidget
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useCallback, useEffect, useMemo,useState } from 'react';
import { ActivityIndicator,ScrollView, Text, View } from 'react-native';

import { getDatabase } from '@/database/client';
import type { SetRow,WorkoutExerciseRow, WorkoutRow } from '@/database/types';
import type { HomeStackParamList } from '@/types';

import { QuickStatsWidget } from '../components/QuickStatsWidget';
import { RecentWorkoutCard } from '../components/RecentWorkoutCard';
import { StreakCard } from '../components/StreakCard';

type HomeNavigation = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

/** 時間帯別の挨拶を返す */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'おはよう';
  if (hour < 18) return 'こんにちは';
  return 'こんばんは';
}

/** ワークアウトの詳細情報（表示用） */
type WorkoutSummary = {
  id: string;
  completedAt: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  durationSeconds: number;
};

/** 最長連続トレーニング日数を計算する */
function calculateLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  // ユニークな日付を取得してソート
  const uniqueDays = new Map<string, Date>();
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!uniqueDays.has(key)) {
      uniqueDays.set(key, d);
    }
  }
  const sorted = Array.from(uniqueDays.values()).sort(
    (a, b) => a.getTime() - b.getTime()
  );

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [loading, setLoading] = useState(true);
  const [workoutSummaries, setWorkoutSummaries] = useState<WorkoutSummary[]>([]);
  const [trainingDates, setTrainingDates] = useState<Date[]>([]);

  // データ取得
  const fetchData = useCallback(async () => {
    try {
      const db = await getDatabase();

      // 完了済みワークアウトを全件取得
      const workouts = await db.getAllAsync<WorkoutRow>(
        "SELECT * FROM workouts WHERE status = 'completed' ORDER BY completed_at DESC"
      );

      if (workouts.length === 0) {
        setWorkoutSummaries([]);
        setTrainingDates([]);
        setLoading(false);
        return;
      }

      // トレーニング日付リスト
      const dates = workouts
        .filter((w) => w.completed_at != null)
        .map((w) => new Date(w.completed_at!));
      setTrainingDates(dates);

      // 各ワークアウトの詳細を取得（最新3件分）
      const recentWorkouts = workouts.slice(0, 3);
      const summaries: WorkoutSummary[] = [];

      for (const workout of recentWorkouts) {
        // 種目を取得
        const exercises = await db.getAllAsync<WorkoutExerciseRow>(
          'SELECT * FROM workout_exercises WHERE workout_id = ?',
          [workout.id]
        );

        // 全セットを取得
        let totalSets = 0;
        let totalVolume = 0;

        for (const exercise of exercises) {
          const sets = await db.getAllAsync<SetRow>(
            'SELECT * FROM sets WHERE workout_exercise_id = ?',
            [exercise.id]
          );
          totalSets += sets.length;
          for (const set of sets) {
            if (set.weight != null && set.reps != null) {
              totalVolume += set.weight * set.reps;
            }
          }
        }

        summaries.push({
          id: workout.id,
          completedAt: workout.completed_at ?? workout.created_at,
          exerciseCount: exercises.length,
          setCount: totalSets,
          totalVolume: Math.round(totalVolume),
          durationSeconds: workout.elapsed_seconds,
        });
      }

      setWorkoutSummaries(summaries);
    } catch (error) {
      console.error('ホーム画面データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 今月/今週のワークアウト回数
  const { monthlyWorkouts, weeklyWorkouts, monthlyVolume, longestStreak } =
    useMemo(() => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      let monthly = 0;
      let weekly = 0;

      for (const date of trainingDates) {
        if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
          monthly++;
        }
        if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
          weekly++;
        }
      }

      // 月間ボリュームは、今月のサマリーの合計
      const monthlyVol = workoutSummaries
        .filter((ws) => {
          const d = new Date(ws.completedAt);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, ws) => sum + ws.totalVolume, 0);

      return {
        monthlyWorkouts: monthly,
        weeklyWorkouts: weekly,
        monthlyVolume: monthlyVol,
        longestStreak: calculateLongestStreak(trainingDates),
      };
    }, [trainingDates, workoutSummaries]);

  // ワークアウト詳細への遷移
  const handleWorkoutPress = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4D94FF" />
      </View>
    );
  }

  // EmptyState: ワークアウトが0件
  if (workoutSummaries.length === 0) {
    return (
      <View className="flex-1 bg-background">
        {/* ヘッダー */}
        <View
          className="bg-white px-5 pt-10 pb-5"
          style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold" style={{ color: '#334155', letterSpacing: -0.3 }}>
              {getGreeting()}、トレーニー
            </Text>
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: '#E6F2FF', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Text className="font-semibold text-[13px] text-primary">T</Text>
            </View>
          </View>
        </View>

        {/* EmptyState */}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[48px] mb-4">💪</Text>
          <Text className="text-base font-semibold text-text-primary mb-2">
            まだワークアウトがありません
          </Text>
          <Text className="text-sm text-text-secondary text-center">
            +ボタンで最初のワークアウトを記録しよう
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* ヘッダー */}
      <View
        className="bg-white px-5 pt-10 pb-5"
        style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-semibold" style={{ color: '#334155', letterSpacing: -0.3 }}>
            {getGreeting()}、トレーニー
          </Text>
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: '#E6F2FF', borderWidth: 1, borderColor: '#e2e8f0' }}
          >
            <Text className="font-semibold text-[13px] text-primary">T</Text>
          </View>
        </View>
        <StreakCard trainingDates={trainingDates} />
      </View>

      {/* メインコンテンツ */}
      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {/* 最近のトレーニング */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-sm font-bold text-text-primary">
            最近のトレーニング
          </Text>
          <Text className="text-xs text-text-secondary">
            {workoutSummaries.length}件
          </Text>
        </View>

        {workoutSummaries.map((ws) => (
          <RecentWorkoutCard
            key={ws.id}
            completedAt={ws.completedAt}
            exerciseCount={ws.exerciseCount}
            setCount={ws.setCount}
            totalVolume={ws.totalVolume}
            durationSeconds={ws.durationSeconds}
            onPress={() => handleWorkoutPress(ws.id)}
          />
        ))}

        {/* ダッシュボードウィジェット */}
        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="text-sm font-bold text-text-primary">
            ダッシュボード
          </Text>
        </View>

        <QuickStatsWidget
          monthlyWorkouts={monthlyWorkouts}
          weeklyWorkouts={weeklyWorkouts}
          monthlyVolume={monthlyVolume}
          longestStreak={longestStreak}
        />

        {/* タブバーのスペーサー */}
        <View style={{ height: 84 }} />
      </ScrollView>
    </View>
  );
}
