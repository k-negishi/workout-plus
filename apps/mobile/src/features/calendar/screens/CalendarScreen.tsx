/**
 * CalendarScreen - カレンダー画面
 * ワイヤーフレーム: screen-calendar セクション準拠
 * MonthCalendar + 下部にDaySummary
 *
 * T11: 記録・編集ボタンを追加
 * T07: calendarSelectedDate の store 連携を削除（FloatingRecordButton 廃止につき不要）
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, isAfter, parseISO } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import { WorkoutRepository } from '@/database/repositories/workout';
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

  // 日付タップ: ローカル状態のみ更新（T07: store.calendarSelectedDate は FloatingRecordButton 廃止により不要）
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

  /**
   * T11: 記録・編集ボタンのハンドラー
   * 選択日に完了済みワークアウトがあれば編集モード、なければ新規記録モードで Record 画面へ遷移する
   */
  const handleRecordOrEdit = useCallback(async () => {
    const existing = await WorkoutRepository.findCompletedByDate(selectedDate);
    if (existing) {
      // 既存ワークアウトがあれば編集モード
      navigation.navigate('Record', { workoutId: existing.id });
    } else {
      // なければ指定日付の新規記録モード
      const today = format(new Date(), 'yyyy-MM-dd');
      if (selectedDate === today) {
        // 当日は targetDate なしで遷移（startSession が Date.now() を使う）
        navigation.navigate('Record', undefined);
      } else {
        navigation.navigate('Record', { targetDate: selectedDate });
      }
    }
  }, [selectedDate, navigation]);

  /**
   * T11: 未来日付への記録は不可
   * 今日より後の日付が選択されている場合は記録ボタンを非表示にする
   */
  const isFutureDate = isAfter(parseISO(selectedDate), new Date());

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

      {/* T11: 記録・編集ボタン（未来日付は非表示） */}
      {!isFutureDate && (
        <TouchableOpacity
          testID="record-or-edit-button"
          onPress={() => void handleRecordOrEdit()}
          style={{
            backgroundColor: '#4D94FF',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>記録・編集</Text>
        </TouchableOpacity>
      )}

      {/* タブバーのスペーサー */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
