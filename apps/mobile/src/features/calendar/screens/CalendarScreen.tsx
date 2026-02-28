/**
 * CalendarScreen - カレンダー画面
 * ワイヤーフレーム: screen-calendar セクション準拠
 * MonthCalendar + 下部にDaySummary
 *
 * T11: 記録・編集ボタンを追加
 * T07: calendarSelectedDate の store 連携を削除（FloatingRecordButton 廃止につき不要）
 */
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, isAfter, parseISO } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import { PersonalRecordRepository } from '@/database/repositories/pr';
import { WorkoutRepository } from '@/database/repositories/workout';
import type { WorkoutRow } from '@/database/types';
import type { CalendarStackParamList } from '@/types';

import { DaySummary } from '../components/DaySummary';
import { MonthCalendar } from '../components/MonthCalendar';

type CalendarNavigation = NativeStackNavigationProp<CalendarStackParamList, 'Calendar'>;
type CalendarRoute = RouteProp<CalendarStackParamList, 'Calendar'>;

export function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigation>();
  const route = useRoute<CalendarRoute>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [trainingDates, setTrainingDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  // DaySummary の再取得トリガー（インクリメントするとデータを再フェッチする）
  const [refreshKey, setRefreshKey] = useState(0);
  // 選択日のワークアウトID（DaySummary から通知される。削除ボタンの表示制御に使用）
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  // DaySummary のロード完了フラグ（false の間はボタンを非表示にしてちらつきを防ぐ）
  const [daySummaryLoaded, setDaySummaryLoaded] = useState(false);

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

  // BottomTab 配下のためフォーカス時にデータを再取得する（Issue #172）
  // useEffect では初回マウント時しか実行されず、タブ切替で戻ってきた際に最新データが反映されない
  useFocusEffect(
    useCallback(() => {
      void fetchTrainingDates();
      // DaySummary のデータも再取得するために refreshKey をインクリメント（Issue #176）
      setRefreshKey((prev) => prev + 1);
    }, [fetchTrainingDates]),
  );

  // T6: targetDate パラメータが渡された場合、選択日付をその値に更新する
  // ホーム画面などから特定の日付を指定してカレンダーを開くユースケースに対応
  useEffect(() => {
    const targetDate = route.params?.targetDate;
    if (targetDate) {
      setSelectedDate(targetDate);
    }
  }, [route.params?.targetDate]);

  // 日付タップ: 日付・currentWorkoutId・daySummaryLoaded をリセット
  // DaySummary が読み込み完了するまでボタンを隠すことでちらつきを防ぐ
  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    setCurrentWorkoutId(null);
    setDaySummaryLoaded(false);
  }, []);

  // Issue #167: 月変更時に新しい月の1日を自動選択する
  // MonthCalendar から渡される dateString はその月の1日（yyyy-MM-dd 形式）
  const handleMonthChange = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    setCurrentWorkoutId(null);
    setDaySummaryLoaded(false);
  }, []);

  // DaySummary のロード完了通知: currentWorkoutId をセットし、ボタン表示を解放する
  const handleWorkoutFound = useCallback((workoutId: string | null) => {
    setCurrentWorkoutId(workoutId);
    setDaySummaryLoaded(true);
  }, []);

  /**
   * 種目名タップ: ExerciseHistory 画面へ遷移する
   */
  const handleNavigateToExerciseHistory = useCallback(
    (exerciseId: string, exerciseName: string) => {
      navigation.navigate('ExerciseHistory', { exerciseId, exerciseName });
    },
    [navigation],
  );

  /**
   * 削除ボタンタップ: ネイティブ Alert で確認後に削除実行
   * カスタム Modal は flexDirection: 'row' のレイアウト不安定が起きるため Alert.alert を使用
   */
  const handleDeleteWorkout = useCallback(
    (workoutId: string) => {
      Alert.alert('ワークアウトを削除', 'このワークアウトを削除してよろしいですか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // PRが参照しているワークアウトを削除する前に、影響する種目IDを収集する
              const affectedExerciseIds =
                await PersonalRecordRepository.findExerciseIdsByWorkoutId(workoutId);

              // 外部キー制約（personal_records.workout_id）を解除するため
              // ワークアウト削除より先にPRを削除する
              await PersonalRecordRepository.deleteByWorkoutId(workoutId);

              // ワークアウト本体を削除（CASCADE で workout_exercises, sets も削除）
              await WorkoutRepository.delete(workoutId);

              // 削除されたワークアウトのPRを残りのワークアウトから再計算する
              // （次点のPRがあれば自動的に2番目の記録が新しいPRになる）
              for (const exerciseId of affectedExerciseIds) {
                await PersonalRecordRepository.recalculateForExercise(exerciseId);
              }

              setRefreshKey((prev) => prev + 1);
              void fetchTrainingDates();
            } catch (error) {
              console.error('ワークアウト削除エラー:', error);
              Alert.alert('エラー', 'ワークアウトの削除に失敗しました');
            }
          },
        },
      ]);
    },
    [fetchTrainingDates],
  );

  /**
   * T11: 記録・編集ボタンのハンドラー
   * 選択日に完了済みワークアウトがあれば編集モード、なければ新規記録モードで Record 画面へ遷移する
   */
  const handleRecordOrEdit = useCallback(async () => {
    const existing = await WorkoutRepository.findCompletedByDate(selectedDate);
    if (existing) {
      // 既存ワークアウトがあれば編集モード（targetDate も渡してヘッダー日付を正しく表示する）
      navigation.navigate('Record', { workoutId: existing.id, targetDate: selectedDate });
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
    <View style={{ flex: 1 }}>
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
          onMonthChange={handleMonthChange}
        />

        {/* 選択日のサマリー */}
        {/* key を外してリマウントを回避。旧データのちらつきは DaySummary 内部の */}
        {/* fetchDayData 先頭 setLoading(true) で防止する */}
        <DaySummary
          dateString={selectedDate}
          onNavigateToExerciseHistory={handleNavigateToExerciseHistory}
          onWorkoutFound={handleWorkoutFound}
          refreshKey={refreshKey}
        />

        {/* T11: 記録・編集ボタン（未来日付・DaySummaryロード中は非表示） */}
        {!isFutureDate && daySummaryLoaded && (
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

        {/* ワークアウト削除ボタン: ワークアウトがある日のみ最下部に表示 */}
        {currentWorkoutId && (
          <TouchableOpacity
            testID="delete-workout-button"
            onPress={() => handleDeleteWorkout(currentWorkoutId)}
            style={{
              alignItems: 'center',
              marginTop: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: '#EF4444',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>
              ワークアウトを削除
            </Text>
          </TouchableOpacity>
        )}

        {/* タブバーのスペーサー */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
