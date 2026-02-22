/**
 * ホームタブ内スタックナビゲーター
 * T06: WorkoutEdit 廃止、Record フロー（Record/ExercisePicker/WorkoutSummary）を追加
 * Home → WorkoutDetail → Record → ExercisePicker → WorkoutSummary
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ExerciseHistoryFullScreen } from '@/features/exercise/screens/ExerciseHistoryFullScreen';
import { ExercisePickerScreen } from '@/features/exercise/screens/ExercisePickerScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { RecordScreen } from '@/features/workout/screens/RecordScreen';
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
import { WorkoutSummaryScreen } from '@/features/workout/screens/WorkoutSummaryScreen';
import type { HomeStackParamList } from '@/types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      {/* T06: Record フローを HomeStack に追加。workoutId あり=編集、なし=新規/過去日付 */}
      <Stack.Screen name="Record" component={RecordScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
    </Stack.Navigator>
  );
}
