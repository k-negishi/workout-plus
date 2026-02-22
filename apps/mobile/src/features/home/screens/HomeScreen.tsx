/**
 * HomeScreen - ホームダッシュボード画面
 * ワイヤーフレーム: home-header + home-main セクション準拠
 * StreakCard、最近のワークアウト3件、QuickStatsWidget
 */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import type { ExerciseRow, SetRow, WorkoutExerciseRow, WorkoutRow } from '@/database/types';
import { colors } from '@/shared/constants/colors';
import type { HomeStackParamList, TimerStatus } from '@/types';

import { QuickStatsWidget } from '../components/QuickStatsWidget';
import { RecentWorkoutCard } from '../components/RecentWorkoutCard';
import { StreakCard } from '../components/StreakCard';
import { WeeklyGoalsWidget } from '../components/WeeklyGoalsWidget';

type HomeNavigation = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

/** getDatabase が返す DB インスタンスの型エイリアス（パラメータ型として使用） */
type AppDatabase = Awaited<ReturnType<typeof getDatabase>>;

/** ワークアウトの詳細情報（表示用） */
type WorkoutSummary = {
  id: string;
  completedAt: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  durationSeconds: number | null;
  timerStatus: TimerStatus;
  /** 最初の種目の部位（カードアイコンの背景色に使用） */
  primaryMuscleGroup?: string;
};

/**
 * ワークアウト1件のサマリーを構築する。
 * fetchData の Cognitive Complexity を下げるためモジュールレベルに分離。
 */
async function buildWorkoutSummary(db: AppDatabase, workout: WorkoutRow): Promise<WorkoutSummary> {
  // 種目を取得
  const exercises = await db.getAllAsync<WorkoutExerciseRow>(
    'SELECT * FROM workout_exercises WHERE workout_id = ?',
    [workout.id],
  );

  // 最初の種目の部位を取得（カードアイコン背景色用）
  let primaryMuscleGroup: string | undefined;
  if (exercises.length > 0) {
    const firstExercise = await db.getFirstAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE id = ?',
      [exercises[0]!.exercise_id],
    );
    primaryMuscleGroup = firstExercise?.muscle_group;
  }

  // 全セットを取得してボリュームを集計
  let totalSets = 0;
  let totalVolume = 0;

  for (const exercise of exercises) {
    const sets = await db.getAllAsync<SetRow>('SELECT * FROM sets WHERE workout_exercise_id = ?', [
      exercise.id,
    ]);
    totalSets += sets.length;
    for (const set of sets) {
      if (set.weight != null && set.reps != null) {
        totalVolume += set.weight * set.reps;
      }
    }
  }

  return {
    id: workout.id,
    completedAt: workout.completed_at ?? workout.created_at,
    exerciseCount: exercises.length,
    setCount: totalSets,
    totalVolume: Math.round(totalVolume),
    durationSeconds: workout.elapsed_seconds,
    timerStatus: workout.timer_status,
    // primaryMuscleGroup が undefined の場合は省略（exactOptionalPropertyTypes 対応）
    ...(primaryMuscleGroup != null ? { primaryMuscleGroup } : {}),
  };
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  // SafeArea 対応: デバイスのノッチ・ダイナミックアイランドに合わせた動的パディング
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [workoutSummaries, setWorkoutSummaries] = useState<WorkoutSummary[]>([]);
  const [trainingDates, setTrainingDates] = useState<Date[]>([]);

  // データ取得
  const fetchData = useCallback(async () => {
    try {
      const db = await getDatabase();

      // 完了済みワークアウトを全件取得
      const workouts = await db.getAllAsync<WorkoutRow>(
        "SELECT * FROM workouts WHERE status = 'completed' ORDER BY completed_at DESC",
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

      // 各ワークアウトの詳細を取得（最新3件分）— helper で複雑度を分散
      const recentWorkouts = workouts.slice(0, 3);
      const summaries = await Promise.all(recentWorkouts.map((w) => buildWorkoutSummary(db, w)));

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

  // 今月/今週のワークアウト回数・前週比・ボリューム・セット数
  const {
    monthlyWorkouts,
    weeklyWorkouts,
    monthlyVolume,
    lastWeekWorkouts,
    weeklySetCount,
    monthlySetCount,
  } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 前週の範囲
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    let monthly = 0;
    let weekly = 0;
    let lastWeekly = 0;

    for (const date of trainingDates) {
      if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
        monthly++;
      }
      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
        weekly++;
      }
      if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) {
        lastWeekly++;
      }
    }

    // 月間ボリュームは、今月のサマリーの合計
    const monthlyVol = workoutSummaries
      .filter((ws) => {
        const d = new Date(ws.completedAt);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, ws) => sum + ws.totalVolume, 0);

    // 今週の総セット数（総負荷量より実際の実施量が直感的に分かるため採用）
    const weeklySets = workoutSummaries
      .filter((ws) => {
        const d = new Date(ws.completedAt);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, ws) => sum + ws.setCount, 0);

    // 月間総セット数
    const monthlySets = workoutSummaries
      .filter((ws) => {
        const d = new Date(ws.completedAt);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, ws) => sum + ws.setCount, 0);

    return {
      monthlyWorkouts: monthly,
      weeklyWorkouts: weekly,
      monthlyVolume: monthlyVol,
      lastWeekWorkouts: lastWeekly,
      weeklySetCount: weeklySets,
      monthlySetCount: monthlySets,
    };
  }, [trainingDates, workoutSummaries]);

  // ワークアウト詳細への遷移
  const handleWorkoutPress = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダーもスクロール領域内に配置して、StreakCard が固定されないようにする */}
        <View
          style={{
            backgroundColor: colors.white,
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: insets.top + 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* タイトルヘッダー行: アプリ名 + 設定ボタン（設定機能は将来対応） */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>Workout+</Text>
            {/* 設定ボタン: タップ時アクションは将来対応 */}
            <TouchableOpacity
              testID="settings-button"
              accessibilityLabel="設定"
              style={{ padding: 8 }}
              // onPress は将来の設定機能実装時に追加する
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <StreakCard trainingDates={trainingDates} />
        </View>

        {/* メインコンテンツ */}
        {/* contentContainerStyle で全体余白を持たせる代わりに、本文ブロックへ個別に余白を適用 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* 今週の目標（WF L2953-2988: home-main 最上部） */}
          {workoutSummaries.length > 0 && (
            <WeeklyGoalsWidget
              thisWeekWorkouts={weeklyWorkouts}
              thisWeekSets={weeklySetCount}
              lastWeekWorkouts={lastWeekWorkouts}
            />
          )}

          {/* 最近のトレーニング */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              最近のトレーニング
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
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
              timerStatus={ws.timerStatus}
              onPress={() => handleWorkoutPress(ws.id)}
              // exactOptionalPropertyTypes 対応: undefined を直接渡さない
              {...(ws.primaryMuscleGroup != null
                ? { primaryMuscleGroup: ws.primaryMuscleGroup }
                : {})}
            />
          ))}

          {/* ダッシュボードウィジェット */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              ダッシュボード
            </Text>
          </View>

          <QuickStatsWidget
            monthlyWorkouts={monthlyWorkouts}
            weeklyWorkouts={weeklyWorkouts}
            monthlyVolume={monthlyVolume}
            monthlySetCount={monthlySetCount}
          />
        </View>
      </ScrollView>
    </View>
  );
}
