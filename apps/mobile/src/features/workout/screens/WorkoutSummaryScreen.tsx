/**
 * ワークアウトサマリー画面（WorkoutSummaryScreen）
 * 完了後の統計情報、PR、種目別サマリーを表示する
 */
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import { PersonalRecordRepository } from '@/database/repositories/pr';
import { colors } from '@/shared/constants/colors';
import { TimerStatus } from '@/types';
import type { RecordStackParamList } from '@/types';

import { calculateVolume } from '../utils/calculate1RM';

// RecordStack 内の画面なので RecordStackParamList を使用する
type SummaryNavProp = NativeStackNavigationProp<RecordStackParamList>;
type SummaryRouteProp = RouteProp<RecordStackParamList, 'WorkoutSummary'>;

/** 種目サマリーデータ */
type ExerciseSummary = {
  exerciseId: string;
  name: string;
  setCount: number;
  volume: number;
};

/** PRデータ */
type PRItem = {
  exerciseName: string;
  label: string;
};

/** 時間を表示用フォーマットにする */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

export const WorkoutSummaryScreen: React.FC = () => {
  const navigation = useNavigation<SummaryNavProp>();
  const route = useRoute<SummaryRouteProp>();
  const { workoutId } = route.params;
  // SafeArea 対応: ノッチ・ダイナミックアイランド対応
  const insets = useSafeAreaInsets();

  const [totalVolume, setTotalVolume] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [setCount, setSetCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>(TimerStatus.NOT_STARTED);
  const [exerciseSummaries, setExerciseSummaries] = useState<ExerciseSummary[]>([]);
  const [prItems, setPrItems] = useState<PRItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** サマリーデータを読み込む */
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const db = await getDatabase();

        // ワークアウト情報を取得
        const workout = await db.getFirstAsync<{
          created_at: number;
          completed_at: number | null;
          elapsed_seconds: number;
          timer_status: TimerStatus;
        }>(
          'SELECT created_at, completed_at, elapsed_seconds, timer_status FROM workouts WHERE id = ?',
          [workoutId],
        );

        if (!workout) return;
        setElapsedSeconds(workout.elapsed_seconds);
        setTimerStatus(workout.timer_status);

        // ワークアウト内の種目を取得
        const exercises = await db.getAllAsync<{
          we_id: string;
          exercise_id: string;
          name: string;
        }>(
          `SELECT we.id AS we_id, we.exercise_id, e.name
           FROM workout_exercises we
           JOIN exercises e ON we.exercise_id = e.id
           WHERE we.workout_id = ?
           ORDER BY we.display_order`,
          [workoutId],
        );

        setExerciseCount(exercises.length);

        let totalVol = 0;
        let totalSets = 0;
        const summaries: ExerciseSummary[] = [];

        for (const ex of exercises) {
          const sets = await db.getAllAsync<{
            weight: number | null;
            reps: number | null;
          }>('SELECT weight, reps FROM sets WHERE workout_exercise_id = ? ORDER BY set_number', [
            ex.we_id,
          ]);

          const validSets = sets.filter((s) => s.weight != null && s.reps != null);
          const vol = calculateVolume(sets);
          totalVol += vol;
          totalSets += validSets.length;

          summaries.push({
            exerciseId: ex.exercise_id,
            name: ex.name,
            setCount: validSets.length,
            volume: vol,
          });
        }

        setTotalVolume(totalVol);
        setSetCount(totalSets);
        setExerciseSummaries(summaries);

        // PR情報を取得
        const prs: PRItem[] = [];
        for (const ex of exercises) {
          const records = await PersonalRecordRepository.findByExerciseId(ex.exercise_id);
          const newPrs = records.filter((r) => r.workoutId === workoutId);
          for (const pr of newPrs) {
            let label = '';
            switch (pr.prType) {
              case 'max_weight':
                label = `最大重量: ${pr.value}kg`;
                break;
              case 'max_reps':
                label = `最大レップ: ${pr.value}回`;
                break;
              case 'max_volume':
                label = `最大ボリューム: ${pr.value}kg`;
                break;
            }
            prs.push({ exerciseName: ex.name, label });
          }
        }
        setPrItems(prs);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [workoutId]);

  /** ホームに戻る
   * RecordStack を Record 画面にリセットしてから、
   * 親のタブ navigator で HomeTab に切り替える。
   * reset しないと戻るボタンで WorkoutSummary に戻ってしまう。
   */
  const handleGoHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Record' }] });
    navigation.getParent()?.navigate('HomeTab' as never);
  };

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-[14px]" style={{ color: colors.textSecondary }}>
          読み込み中...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
    >
      {/* ヘッダー */}
      <View className="items-center mb-6" style={{ paddingTop: insets.top + 16 }}>
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: '#D1FAE5' }}
        >
          <Text className="text-[24px]" style={{ color: colors.success }}>
            {'\u2713'}
          </Text>
        </View>
        <Text className="text-[24px] font-bold" style={{ color: colors.textPrimary }}>
          ワークアウト完了
        </Text>
      </View>

      {/* メインカード */}
      <View
        className="bg-white rounded-xl p-5 mb-4 items-center"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        <Text className="text-[14px] mb-2" style={{ color: colors.textSecondary }}>
          所要時間
        </Text>
        <Text className="text-[16px] font-semibold" style={{ color: colors.textPrimary }}>
          {timerStatus === 'discarded' ? '―' : formatDuration(elapsedSeconds)}
        </Text>
      </View>

      {/* 統計グリッド */}
      <View className="flex-row flex-wrap gap-3 mb-4">
        <View
          className="flex-1 min-w-[45%] bg-white rounded-lg p-4 items-center"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-[20px] font-bold" style={{ color: colors.textPrimary }}>
            {totalVolume.toLocaleString()}
            <Text className="text-[12px] font-normal" style={{ color: colors.textSecondary }}>
              {' '}
              kg
            </Text>
          </Text>
          <Text className="text-[12px] mt-1" style={{ color: colors.textSecondary }}>
            総ボリューム
          </Text>
        </View>
        <View
          className="flex-1 min-w-[45%] bg-white rounded-lg p-4 items-center"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-[20px] font-bold" style={{ color: colors.textPrimary }}>
            {exerciseCount}
            <Text className="text-[12px] font-normal" style={{ color: colors.textSecondary }}>
              {' '}
              種目
            </Text>
          </Text>
          <Text className="text-[12px] mt-1" style={{ color: colors.textSecondary }}>
            種目数
          </Text>
        </View>
        <View
          className="flex-1 min-w-[45%] bg-white rounded-lg p-4 items-center"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-[20px] font-bold" style={{ color: colors.textPrimary }}>
            {setCount}
            <Text className="text-[12px] font-normal" style={{ color: colors.textSecondary }}>
              {' '}
              セット
            </Text>
          </Text>
          <Text className="text-[12px] mt-1" style={{ color: colors.textSecondary }}>
            セット数
          </Text>
        </View>
      </View>

      {/* PR セクション */}
      {prItems.length > 0 && (
        <View className="mb-4">
          <Text className="text-[14px] font-semibold mb-2" style={{ color: colors.textPrimary }}>
            新記録達成
          </Text>
          {prItems.map((pr, index) => (
            <View
              key={`pr-${index}`}
              className="flex-row justify-between items-center bg-white rounded-lg px-4 py-3 mb-2"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              <View>
                <Text className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                  {pr.exerciseName}
                </Text>
                <Text className="text-[12px]" style={{ color: colors.textSecondary }}>
                  {pr.label}
                </Text>
              </View>
              <View className="px-2 py-[2px] rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                <Text className="text-[11px] font-bold" style={{ color: colors.warning }}>
                  NEW
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 種目別サマリー */}
      <View className="mb-6">
        <Text className="text-[14px] font-semibold mb-2" style={{ color: colors.textPrimary }}>
          種目別サマリー
        </Text>
        <View
          className="bg-white rounded-lg overflow-hidden"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          {exerciseSummaries.map((summary, index) => (
            <View
              key={summary.exerciseId}
              className="flex-row justify-between items-center px-4 py-3"
              style={
                index < exerciseSummaries.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                  : undefined
              }
            >
              <Text className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                {summary.name}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-[14px]" style={{ color: colors.textSecondary }}>
                  {summary.setCount}セット
                </Text>
                <Text className="text-[14px]" style={{ color: colors.textSecondary }}>
                  {'\u2022'}
                </Text>
                <Text className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                  {summary.volume.toLocaleString()}kg
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ホームに戻るボタン */}
      <TouchableOpacity
        onPress={handleGoHome}
        className="rounded-lg py-4 items-center mt-6"
        style={{ backgroundColor: colors.primary }}
        accessibilityLabel="ホームに戻る"
      >
        <Text className="text-[16px] font-semibold text-white">ホームに戻る</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
