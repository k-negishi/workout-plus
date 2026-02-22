/**
 * カレンダータブ内スタックナビゲーター
 * T06: WorkoutEdit 廃止、Record フロー（Record/ExercisePicker/WorkoutSummary）を追加
 * Calendar → WorkoutDetail → Record → ExercisePicker → WorkoutSummary
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { ExerciseHistoryFullScreen } from '@/features/exercise/screens/ExerciseHistoryFullScreen';
import { ExercisePickerScreen } from '@/features/exercise/screens/ExercisePickerScreen';
import { RecordScreen } from '@/features/workout/screens/RecordScreen';
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
import { WorkoutSummaryScreen } from '@/features/workout/screens/WorkoutSummaryScreen';
import type { CalendarStackParamList } from '@/types';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      {/* T06: Record フローをCalendarStack に追加。カレンダーから過去日付記録・編集に対応 */}
      <Stack.Screen name="Record" component={RecordScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
    </Stack.Navigator>
  );
}
