/**
 * 記録スタックナビゲーター（通常pushナビゲーション）
 * Record → ExercisePicker / ExerciseHistory → WorkoutSummary
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ExerciseHistoryFullScreen } from '@/features/exercise/screens/ExerciseHistoryFullScreen';
import { ExercisePickerScreen } from '@/features/exercise/screens/ExercisePickerScreen';
import { RecordScreen } from '@/features/workout/screens/RecordScreen';
import { WorkoutSummaryScreen } from '@/features/workout/screens/WorkoutSummaryScreen';
import type { RecordStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RecordStackParamList>();

export function RecordStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Record" component={RecordScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
    </Stack.Navigator>
  );
}
