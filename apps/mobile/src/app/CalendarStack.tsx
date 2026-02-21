/**
 * カレンダータブ内スタックナビゲーター
 * Calendar → WorkoutDetail
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
import type { CalendarStackParamList } from '@/types';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </Stack.Navigator>
  );
}
