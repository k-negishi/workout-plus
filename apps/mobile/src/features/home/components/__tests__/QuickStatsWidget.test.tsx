/**
 * QuickStatsWidget テスト
 *
 * 案Aレイアウト（今月・今週の2カード）の表示を検証する。
 * - 今月: ワークアウト数 / 種目数 / セット数
 * - 今週: ワークアウト数 / 種目数 / セット数
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { QuickStatsWidget } from '../QuickStatsWidget';

// SVG モック（アイコンを持たないため不要だが、依存が残る場合に備えて定義）
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  const mockSvg = (name: string) => {
    const C = (props: Record<string, unknown>) => RN.createElement(name, props, props['children']);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: mockSvg('Svg'),
    Svg: mockSvg('Svg'),
    Path: mockSvg('Path'),
    Circle: mockSvg('Circle'),
    Line: mockSvg('Line'),
    Polyline: mockSvg('Polyline'),
  };
});

const defaultProps = {
  monthlyWorkouts: 8,
  monthlyExerciseCount: 24,
  monthlySetCount: 96,
  weeklyWorkouts: 3,
  weeklyExerciseCount: 9,
  weeklySetCount: 36,
};

describe('QuickStatsWidget - 今月セクション', () => {
  it('「今月」ラベルが表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByText('今月')).toBeTruthy();
  });

  it('今月のワークアウト数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    // testID で今月セクション内の値を確認
    expect(screen.getByTestId('monthly-workouts-value')).toBeTruthy();
    expect(screen.getByTestId('monthly-workouts-value').props.children).toBe(8);
  });

  it('今月の種目数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByTestId('monthly-exercise-value')).toBeTruthy();
    expect(screen.getByTestId('monthly-exercise-value').props.children).toBe(24);
  });

  it('今月のセット数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByTestId('monthly-set-value')).toBeTruthy();
    expect(screen.getByTestId('monthly-set-value').props.children).toBe(96);
  });
});

describe('QuickStatsWidget - 今週セクション', () => {
  it('「今週」ラベルが表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByText('今週')).toBeTruthy();
  });

  it('今週のワークアウト数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByTestId('weekly-workouts-value')).toBeTruthy();
    expect(screen.getByTestId('weekly-workouts-value').props.children).toBe(3);
  });

  it('今週の種目数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByTestId('weekly-exercise-value')).toBeTruthy();
    expect(screen.getByTestId('weekly-exercise-value').props.children).toBe(9);
  });

  it('今週のセット数が表示される', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    expect(screen.getByTestId('weekly-set-value')).toBeTruthy();
    expect(screen.getByTestId('weekly-set-value').props.children).toBe(36);
  });
});

describe('QuickStatsWidget - カラムラベル', () => {
  it('「ワークアウト」ラベルが2つ表示される（今月・今週）', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    const labels = screen.getAllByText('ワークアウト');
    expect(labels).toHaveLength(2);
  });

  it('「種目」ラベルが2つ表示される（今月・今週）（#157）', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    const labels = screen.getAllByText('種目');
    expect(labels).toHaveLength(2);
    // 旧ラベル「種目数」は表示されない
    expect(screen.queryByText('種目数')).toBeNull();
  });

  it('「セット」ラベルが2つ表示される（今月・今週）（#157）', () => {
    render(<QuickStatsWidget {...defaultProps} />);
    const labels = screen.getAllByText('セット');
    expect(labels).toHaveLength(2);
    // 旧ラベル「セット数」は表示されない
    expect(screen.queryByText('セット数')).toBeNull();
  });
});

describe('QuickStatsWidget - ゼロ値', () => {
  it('全指標が0でもクラッシュしない', () => {
    const zeroProps = {
      monthlyWorkouts: 0,
      monthlyExerciseCount: 0,
      monthlySetCount: 0,
      weeklyWorkouts: 0,
      weeklyExerciseCount: 0,
      weeklySetCount: 0,
    };
    expect(() => render(<QuickStatsWidget {...zeroProps} />)).not.toThrow();
  });
});
