/**
 * CalendarStack のナビゲーション登録テスト（T06/T13/T08 対応）
 *
 * T13: WorkoutEditScreen 廃止。WorkoutEdit のモック・テストを削除。
 * T06: CalendarStack に Record フローを追加。Record への遷移テストを追加。
 * T08: WorkoutDetailScreen 廃止。WorkoutDetail 関連のモック・テストを削除。
 */
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
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

// CalendarScreen モック（SQLite・store 依存を排除）
jest.mock('@/features/calendar/screens/CalendarScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    CalendarScreen: ({
      navigation,
    }: {
      navigation: { navigate: (name: string, params?: object) => void };
    }) =>
      React.createElement(
        View,
        { testID: 'calendar-screen' },
        React.createElement(
          TouchableOpacity,
          {
            testID: 'go-to-record',
            onPress: () => navigation.navigate('Record', { targetDate: '2026-01-15' }),
          },
          React.createElement(Text, null, '記録・編集'),
        ),
      ),
  };
});

// RecordScreen モック（T06: CalendarStack に追加）
jest.mock('@/features/workout/screens/RecordScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    RecordScreen: () => React.createElement(View, { testID: 'record-screen' }),
  };
});

// ExercisePickerScreen モック
jest.mock('@/features/exercise/screens/ExercisePickerScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    ExercisePickerScreen: () => React.createElement(View, { testID: 'exercise-picker-screen' }),
  };
});

// WorkoutSummaryScreen モック
jest.mock('@/features/workout/screens/WorkoutSummaryScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    WorkoutSummaryScreen: () => React.createElement(View, { testID: 'workout-summary-screen' }),
  };
});

// ExerciseHistoryFullScreen モック
jest.mock('@/features/exercise/screens/ExerciseHistoryFullScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    ExerciseHistoryFullScreen: () =>
      React.createElement(View, { testID: 'exercise-history-screen' }),
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
    renderCalendarStack();
    expect(screen.getByTestId('calendar-screen')).toBeTruthy();
  });

  it('T06: CalendarStack から Record へ遷移できる（記録・編集ボタン）', async () => {
    renderCalendarStack();
    fireEvent.press(screen.getByTestId('go-to-record'));
    expect(await screen.findByTestId('record-screen')).toBeTruthy();
  });
});
