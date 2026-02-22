/**
 * ホームタブ内スタックナビゲーター
 * Home → WorkoutDetail → WorkoutEdit
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ExerciseHistoryFullScreen } from '@/features/exercise/screens/ExerciseHistoryFullScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { WorkoutDetailScreen } from '@/features/workout/screens/WorkoutDetailScreen';
import { WorkoutEditScreen } from '@/features/workout/screens/WorkoutEditScreen';
import type { HomeStackParamList } from '@/types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="WorkoutEdit" component={WorkoutEditScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryFullScreen} />
    </Stack.Navigator>
  );
}
