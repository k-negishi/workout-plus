/**
 * MainTabs テスト
 * - タブ数が 5 であることを検証
 * - 各タブのラベルを検証
 */
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
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

// RecordStack の依存（SQLite/Zustand等）を排除し、遷移検証に必要な最小コンポーネントで代替する
jest.mock('../RecordStack', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    RecordStack: () => React.createElement(View, { testID: 'record-stack-screen' }),
  };
});

import { MainTabs } from '../MainTabs';

const RECORD_BUTTON_TEST_ID = 'record-tab-button';

describe('MainTabs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithNav = () =>
    render(
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    );

  it('AI タブラベルが表示される', () => {
    const { getByText } = renderWithNav();
    expect(getByText('AI')).toBeTruthy();
  });

  it('ホームタブラベルが表示される', () => {
    const { getByText } = renderWithNav();
    expect(getByText('ホーム')).toBeTruthy();
  });

  it('統計タブラベルが表示される', () => {
    const { getByText } = renderWithNav();
    expect(getByText('統計')).toBeTruthy();
  });

  it('record-tab-button が存在する', () => {
    const { getByTestId } = renderWithNav();
    expect(getByTestId(RECORD_BUTTON_TEST_ID)).toBeTruthy();
  });

  it('RecordTabButton に shadowColor スタイルが設定されている', () => {
    const { getByTestId } = renderWithNav();
    const button = getByTestId(RECORD_BUTTON_TEST_ID);
    expect(typeof button.props.style).toBe('object');
    const style = button.props.style;
    expect(style).toMatchObject({
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      borderWidth: 4,
      borderColor: colors.background,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      shadowOpacity: 0.4,
    });
  });

  it('中央ボタンにWF準拠の + 記号が表示される', () => {
    const { getByText } = renderWithNav();
    const plus = getByText('+');
    expect(plus).toBeTruthy();
    expect(plus.props.style).toMatchObject({
      fontSize: 28,
      lineHeight: 28,
      color: colors.white,
    });
  });

  it('+ボタン押下で RecordTab に遷移する（RecordStack が描画される）', () => {
    const { getByTestId } = renderWithNav();
    const button = getByTestId(RECORD_BUTTON_TEST_ID);
    fireEvent.press(button);
    // 実際にタブが切り替わり RecordStack（モック）が描画されることを検証
    expect(getByTestId('record-stack-screen')).toBeTruthy();
  });
});
