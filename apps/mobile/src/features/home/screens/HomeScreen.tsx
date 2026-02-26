/**
 * HomeScreen - ホームダッシュボード画面
 * ワイヤーフレーム: home-header + home-main セクション準拠
 * StreakCard、最近のワークアウト3件、QuickStatsWidget
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { WorkoutRepository } from '@/database/repositories/workout';
import type { ExerciseRow, SetRow, WorkoutExerciseRow, WorkoutRow } from '@/database/types';
import { colors } from '@/shared/constants/colors';
import type { HomeStackParamList, MainTabParamList, TimerStatus } from '@/types';

import { OnTrackBadge } from '../components/OnTrackBadge';
import { QuickStatsWidget } from '../components/QuickStatsWidget';
import { RecentWorkoutCard } from '../components/RecentWorkoutCard';
import { StreakCard } from '../components/StreakCard';
import { WeeklyGoalsWidget } from '../components/WeeklyGoalsWidget';

/**
 * T7: HomeScreen のナビゲーション型
 * CompositeNavigationProp を使って HomeStack と MainTab の両方を型安全に扱う。
 * これにより CalendarTab へのクロスタブ遷移が型チェックされる。
 */
type HomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'Home'>,
  BottomTabNavigationProp<MainTabParamList>
>;

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
  /** ワークアウトに含まれる部位の配列（重複排除済み） */
  muscleGroups: string[];
};

/** ダッシュボード統計（SQL集計値） */
type DashboardStats = {
  monthlyExerciseCount: number;
  monthlySetCount: number;
  weeklyExerciseCount: number;
  weeklySetCount: number;
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

  // 全種目の部位を取得（重複排除、順序保持）
  const muscleGroups: string[] = [];
  const seenGroups = new Set<string>();
  for (const exercise of exercises) {
    const exerciseRow = await db.getFirstAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE id = ?',
      [exercise.exercise_id],
    );
    if (exerciseRow && !seenGroups.has(exerciseRow.muscle_group)) {
      seenGroups.add(exerciseRow.muscle_group);
      muscleGroups.push(exerciseRow.muscle_group);
    }
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
    muscleGroups,
  };
}

/**
 * 指定期間の種目数・セット数を SQL で集計する。
 * JS 側ループより効率的で、最近3件以外のワークアウトも正確に集計できる。
 */
async function fetchPeriodStats(
  db: AppDatabase,
  startMs: number,
  endMs: number,
): Promise<{ exerciseCount: number; setCount: number }> {
  const exerciseResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(we.id) AS count
     FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.status = 'completed' AND w.completed_at BETWEEN ? AND ?`,
    [startMs, endMs],
  );

  const setResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(s.id) AS count
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.status = 'completed' AND w.completed_at BETWEEN ? AND ?`,
    [startMs, endMs],
  );

  return {
    exerciseCount: exerciseResult?.count ?? 0,
    setCount: setResult?.count ?? 0,
  };
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  // SafeArea 対応: デバイスのノッチ・ダイナミックアイランドに合わせた動的パディング
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [workoutSummaries, setWorkoutSummaries] = useState<WorkoutSummary[]>([]);
  const [trainingDates, setTrainingDates] = useState<Date[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    monthlyExerciseCount: 0,
    monthlySetCount: 0,
    weeklyExerciseCount: 0,
    weeklySetCount: 0,
  });
  /** T10: 記録中セッションの有無（バナー表示制御） */
  const [isRecording, setIsRecording] = useState(false);
  /** 当日完了済みワークアウトの有無（ボタンテキスト切替用） */
  const [hasTodayCompleted, setHasTodayCompleted] = useState(false);

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

      // トレーニング日付リスト（StreakCard 用）
      const dates = workouts
        .filter((w) => w.completed_at != null)
        .map((w) => new Date(w.completed_at!));
      setTrainingDates(dates);

      // 各ワークアウトの詳細を取得（最新3件分）— helper で複雑度を分散
      const recentWorkouts = workouts.slice(0, 3);
      const summaries = await Promise.all(recentWorkouts.map((w) => buildWorkoutSummary(db, w)));
      setWorkoutSummaries(summaries);

      // ダッシュボード統計を SQL 集計で取得する。
      // workoutSummaries は最新3件しか持たないため、月次・週次の正確な集計には SQL が必要。
      const now = new Date();
      const monthStartMs = startOfMonth(now).getTime();
      const monthEndMs = endOfMonth(now).getTime();
      const weekStartMs = startOfWeek(now, { weekStartsOn: 1 }).getTime();
      const weekEndMs = endOfWeek(now, { weekStartsOn: 1 }).getTime();

      const [monthlyStats, weeklyStats] = await Promise.all([
        fetchPeriodStats(db, monthStartMs, monthEndMs),
        fetchPeriodStats(db, weekStartMs, weekEndMs),
      ]);

      setDashboardStats({
        monthlyExerciseCount: monthlyStats.exerciseCount,
        monthlySetCount: monthlyStats.setCount,
        weeklyExerciseCount: weeklyStats.exerciseCount,
        weeklySetCount: weeklyStats.setCount,
      });
    } catch (error) {
      console.error('ホーム画面データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * T10: 画面フォーカス時に記録中セッションを確認する。
   * useFocusEffect を使う理由: BottomTab 画面はアンマウントされないため、
   * 他の画面から戻ってきた際に useEffect([], []) では再実行されない。
   */
  useFocusEffect(
    useCallback(() => {
      const checkStatus = async () => {
        const [recording, todayCompleted] = await Promise.all([
          WorkoutRepository.findRecording(),
          WorkoutRepository.findTodayCompleted(),
        ]);
        setIsRecording(recording !== null);
        setHasTodayCompleted(todayCompleted !== null);
      };
      void checkStatus();
    }, []),
  );

  /**
   * T10: 「本日のワークアウトを記録」ボタンのハンドラー
   * 当日完了済みワークアウトがあれば編集モード、なければ新規記録モードで Record 画面へ遷移する
   */
  const handleRecordButtonPress = useCallback(async () => {
    const todayWorkout = await WorkoutRepository.findTodayCompleted();
    if (todayWorkout) {
      // 当日完了済みワークアウトがあれば編集モードで開く
      navigation.navigate('Record', { workoutId: todayWorkout.id });
    } else {
      // なければ新規記録モード
      navigation.navigate('Record', undefined);
    }
  }, [navigation]);

  /**
   * T10: 記録中バナータップ → 記録画面へ（記録継続）
   * recording 状態のワークアウトは startSession が既存セッションを復元する
   */
  const handleRecordingBannerPress = useCallback(() => {
    navigation.navigate('Record', undefined);
  }, [navigation]);

  // 今月/今週のワークアウト回数と前週比（trainingDates から集計）
  const { monthlyWorkouts, weeklyWorkouts, lastWeekWorkouts } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 前週比表示のため WeeklyGoalsWidget が必要とする前週ワークアウト数
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

    return {
      monthlyWorkouts: monthly,
      weeklyWorkouts: weekly,
      lastWeekWorkouts: lastWeekly,
    };
  }, [trainingDates]);

  /**
   * T7: ワークアウトカードタップ → CalendarTab へクロスタブ遷移する。
   * completed_at の UNIX ミリ秒から yyyy-MM-dd 形式の日付を生成し、
   * Calendar 画面の targetDate として渡すことで該当日付をハイライトさせる。
   */
  const handleWorkoutPress = useCallback(
    (workoutId: string) => {
      const ws = workoutSummaries.find((w) => w.id === workoutId);
      if (!ws?.completedAt) return;

      const d = new Date(ws.completedAt);
      // ローカルタイムゾーンで yyyy-MM-dd を生成する（サーバー UTC 変換は不要）
      const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      navigation.navigate('CalendarTab', {
        screen: 'Calendar',
        params: { targetDate },
      });
    },
    [navigation, workoutSummaries],
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>
                Workout Plus
              </Text>
              <OnTrackBadge weeklyWorkouts={weeklyWorkouts} />
            </View>
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

        {/* T10: 記録中バナー。記録中セッションがある場合のみ表示する */}
        {isRecording && (
          <TouchableOpacity
            testID="recording-banner"
            onPress={handleRecordingBannerPress}
            style={{
              backgroundColor: '#E6F2FF',
              borderWidth: 1,
              borderColor: '#4D94FF',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginHorizontal: 20,
              marginTop: 16,
              marginBottom: 4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4D94FF' }}>
              記録中のワークアウト
            </Text>
            <Text style={{ fontSize: 14, color: '#4D94FF' }}>続けて記録する →</Text>
          </TouchableOpacity>
        )}

        {/* 記録中でないときのみワークアウト記録ボタンを表示する（記録中はバナーのみ） */}
        {!isRecording && (
          <TouchableOpacity
            testID="record-workout-button"
            onPress={() => void handleRecordButtonPress()}
            style={{
              backgroundColor: '#4D94FF',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 16,
              alignItems: 'center',
              marginHorizontal: 20,
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
              {hasTodayCompleted ? '本日のワークアウトを再開する' : '本日のワークアウトを記録'}
            </Text>
          </TouchableOpacity>
        )}

        {/* メインコンテンツ */}
        {/* contentContainerStyle で全体余白を持たせる代わりに、本文ブロックへ個別に余白を適用 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* 今週の目標（WF L2953-2988: home-main 最上部） */}
          {workoutSummaries.length > 0 && (
            <WeeklyGoalsWidget
              thisWeekWorkouts={weeklyWorkouts}
              thisWeekSets={dashboardStats.weeklySetCount}
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              最近のトレーニング
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {workoutSummaries.length}件
            </Text>
          </View>

          {workoutSummaries.map((ws) => (
            <RecentWorkoutCard
              key={ws.id}
              testID={`workout-card-${ws.id}`}
              completedAt={ws.completedAt}
              exerciseCount={ws.exerciseCount}
              setCount={ws.setCount}
              totalVolume={ws.totalVolume}
              durationSeconds={ws.durationSeconds}
              timerStatus={ws.timerStatus}
              muscleGroups={ws.muscleGroups}
              onPress={() => handleWorkoutPress(ws.id)}
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              ダッシュボード
            </Text>
          </View>

          <QuickStatsWidget
            monthlyWorkouts={monthlyWorkouts}
            monthlyExerciseCount={dashboardStats.monthlyExerciseCount}
            monthlySetCount={dashboardStats.monthlySetCount}
            weeklyWorkouts={weeklyWorkouts}
            weeklyExerciseCount={dashboardStats.weeklyExerciseCount}
            weeklySetCount={dashboardStats.weeklySetCount}
          />
        </View>
      </ScrollView>
    </View>
  );
}
