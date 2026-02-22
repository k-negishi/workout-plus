/**
 * CalendarScreen - カレンダー画面
 * ワイヤーフレーム: screen-calendar セクション準拠
 * MonthCalendar + 下部にDaySummary
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import type { WorkoutRow } from '@/database/types';
import type { CalendarStackParamList } from '@/types';

import { DaySummary } from '../components/DaySummary';
import { MonthCalendar } from '../components/MonthCalendar';

type CalendarNavigation = NativeStackNavigationProp<CalendarStackParamList, 'Calendar'>;

export function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigation>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [trainingDates, setTrainingDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // トレーニング日のデータ取得
  const fetchTrainingDates = useCallback(async () => {
    try {
      const db = await getDatabase();
      const workouts = await db.getAllAsync<WorkoutRow>(
        "SELECT * FROM workouts WHERE status = 'completed' AND completed_at IS NOT NULL",
      );

      const dates = workouts.map((w) => new Date(w.completed_at!));
      setTrainingDates(dates);
    } catch (error) {
      console.error('カレンダーデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainingDates();
  }, [fetchTrainingDates]);

  // 日付タップ
  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDate(dateString);
  }, []);

  // ワークアウト詳細への遷移
  const handleNavigateToDetail = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4D94FF" />
      </View>
    );
  }

  return (
    <ScrollView
      testID="calendar-scroll-view"
      className="flex-1 bg-background px-5"
      style={{ paddingTop: insets.top + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* カレンダー */}
      <MonthCalendar
        trainingDates={trainingDates}
        selectedDate={selectedDate}
        onDayPress={handleDayPress}
      />

      {/* 選択日のサマリー */}
      <DaySummary dateString={selectedDate} onNavigateToDetail={handleNavigateToDetail} />

      {/* タブバーのスペーサー */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
