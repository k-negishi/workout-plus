/**
 * カレンダータブ内スタックナビゲーター
 * Calendar → WorkoutDetail → WorkoutEdit
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { ExerciseHistoryFullScreen } from '@/features/exercise/screens/ExerciseHistoryFullScreen';
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
import { WorkoutEditScreen } from '@/features/workout/screens/WorkoutEditScreen';
import type { CalendarStackParamList } from '@/types';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      {/* カレンダーから過去ワークアウトを編集するための画面 */}
      <Stack.Screen name="WorkoutEdit" component={WorkoutEditScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
    </Stack.Navigator>
  );
}
