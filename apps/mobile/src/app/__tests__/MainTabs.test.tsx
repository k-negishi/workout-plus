/**
 * MainTabs テスト（T07: 4タブ化対応）
 * - タブ数が 4 であることを検証
 * - 各タブのラベルを検証
 * - record-tab-button が存在しないことを検証（FloatingRecordButton 廃止）
 */
import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { colors } from '@/shared/constants/colors';

// bottom-tabs が SafeAreaInsetsContext.Consumer を使うため Context ごとモック
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

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// gifted-charts は ESM のみ配布のため jest-expo 環境でパースエラーになる
jest.mock('react-native-gifted-charts', () => ({
  BarChart: 'BarChart',
}));

// T07: RecordStack 廃止。CalendarStack/HomeStack に Record フローが移動したため
// HomeStack・CalendarStack もモックして依存を排除する
jest.mock('../HomeStack', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    HomeStack: () => React.createElement(View, { testID: 'home-stack-screen' }),
  };
});

jest.mock('../CalendarStack', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    CalendarStack: () => React.createElement(View, { testID: 'calendar-stack-screen' }),
  };
});

import { MainTabs } from '../MainTabs';

describe('MainTabs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithNav = () =>
    render(
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>,
    );

  it('AI タブラベルが表示される', () => {
    renderWithNav();
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('ホームタブラベルが表示される', () => {
    renderWithNav();
    expect(screen.getByText('ホーム')).toBeTruthy();
  });

  it('統計タブラベルが表示される', () => {
    renderWithNav();
    expect(screen.getByText('統計')).toBeTruthy();
  });

  it('カレンダータブラベルが表示される', () => {
    renderWithNav();
    expect(screen.getByText('カレンダー')).toBeTruthy();
  });

  it('T07: record-tab-button が存在しない（FloatingRecordButton 廃止）', () => {
    renderWithNav();
    // T07 で FloatingRecordButton を廃止したため testID が存在しないことを検証する
    expect(screen.queryByTestId('record-tab-button')).toBeNull();
  });

  it('T07: 4タブ構成である（ホーム/カレンダー/統計/AI）', () => {
    renderWithNav();
    // 4つのタブラベルが全て表示されることを確認
    expect(screen.getByText('ホーム')).toBeTruthy();
    expect(screen.getByText('カレンダー')).toBeTruthy();
    expect(screen.getByText('統計')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('ホームタブのアイコン色がプライマリカラーである（フォーカス時）', () => {
    renderWithNav();
    // ホームタブがデフォルトでアクティブなので、プライマリカラーが適用されることを確認
    // タブラベルの色を確認する（アクティブ = colors.primary）
    const homeLabel = screen.getByText('ホーム');
    expect(homeLabel.props.style).toMatchObject({
      color: colors.primary,
    });
  });
});
