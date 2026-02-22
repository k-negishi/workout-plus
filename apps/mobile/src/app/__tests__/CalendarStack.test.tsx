/**
 * CalendarStack のナビゲーション登録テスト
 * - WorkoutEdit 画面が CalendarStack に登録されていることを検証
 * - カレンダー → WorkoutEdit への遷移が正常に動作することを検証
 */
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// SafeAreaContext モック（bottom-tabs が使用）
const insets = { top: 44, bottom: 34, left: 0, right: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const InsetsContext = React.createContext(insets);
  const FrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext: InsetsContext,
    SafeAreaFrameContext: FrameContext,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

// CalendarScreen モック（SQLite 依存を排除）
jest.mock('@/features/calendar/screens/CalendarScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    CalendarScreen: ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) =>
      React.createElement(
        View,
        { testID: 'calendar-screen' },
        React.createElement(
          TouchableOpacity,
          {
            testID: 'go-to-detail',
            onPress: () => navigation.navigate('WorkoutDetail', { workoutId: 'test-id' }),
          },
          React.createElement(Text, null, '詳細へ'),
        ),
      ),
  };
});

// WorkoutDetailScreen モック（編集ボタン付き）
jest.mock('@/features/workout/screens/WorkoutDetailScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    WorkoutDetailScreen: ({ navigation, route }: { navigation: { navigate: (name: string, params?: object) => void }; route: { params: { workoutId: string } } }) =>
      React.createElement(
        View,
        { testID: 'workout-detail-screen' },
        React.createElement(
          TouchableOpacity,
          {
            testID: 'edit-button',
            // CalendarStack 経由で WorkoutEdit へ遷移するボタン
            onPress: () => navigation.navigate('WorkoutEdit', { workoutId: route.params.workoutId }),
          },
          React.createElement(Text, null, '編集'),
        ),
      ),
  };
});

// WorkoutEditScreen モック
jest.mock('@/features/workout/screens/WorkoutEditScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    WorkoutEditScreen: () => React.createElement(View, { testID: 'workout-edit-screen' }),
  };
});

// ExerciseHistoryFullScreen モック
jest.mock('@/features/exercise/screens/ExerciseHistoryFullScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    ExerciseHistoryFullScreen: () => React.createElement(View, { testID: 'exercise-history-screen' }),
  };
});

import { CalendarStack } from '../CalendarStack';

const renderCalendarStack = () =>
  render(
    <NavigationContainer>
      <CalendarStack />
    </NavigationContainer>,
  );

describe('CalendarStack', () => {
  it('初期表示でカレンダー画面が表示される', () => {
    const { getByTestId } = renderCalendarStack();
    expect(getByTestId('calendar-screen')).toBeTruthy();
  });

  it('CalendarStack から WorkoutDetail へ遷移できる', async () => {
    const { getByTestId } = renderCalendarStack();
    await act(async () => {
      fireEvent.press(getByTestId('go-to-detail'));
    });
    expect(getByTestId('workout-detail-screen')).toBeTruthy();
  });

  it('WorkoutDetail の編集ボタンから WorkoutEdit へ遷移できる（カレンダー経由）', async () => {
    const { getByTestId } = renderCalendarStack();

    // Calendar → WorkoutDetail へ遷移
    await act(async () => {
      fireEvent.press(getByTestId('go-to-detail'));
    });
    expect(getByTestId('workout-detail-screen')).toBeTruthy();

    // WorkoutDetail → WorkoutEdit へ遷移（これが今回の修正対象）
    await act(async () => {
      fireEvent.press(getByTestId('edit-button'));
    });
    expect(getByTestId('workout-edit-screen')).toBeTruthy();
  });
});
