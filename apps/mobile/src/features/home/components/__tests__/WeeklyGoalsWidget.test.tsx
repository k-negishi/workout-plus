/**
 * WeeklyGoalsWidget テスト
 * - goals-grid, progress-bar, progress-fill の testID が存在すること
 * - 達成率 100% のときプログレスバーが100%幅になること
 * - thisWeekWorkouts=0 のとき達成率が0%になること
 */
import { render, screen } from '@testing-library/react-native';

import { WeeklyGoalsWidget } from '../WeeklyGoalsWidget';

describe('WeeklyGoalsWidget', () => {
  const defaultProps = {
    thisWeekWorkouts: 2,
    // prop 名を thisWeekVolume → thisWeekSets に変更したため更新
    thisWeekSets: 20,
    lastWeekWorkouts: 1,
    targetWorkouts: 3,
  };

  it('goals-grid 要素が存在する', () => {
    render(<WeeklyGoalsWidget {...defaultProps} />);
    expect(screen.getByTestId('goals-grid')).toBeTruthy();
  });

  it('progress-bar 要素が存在する', () => {
    render(<WeeklyGoalsWidget {...defaultProps} />);
    expect(screen.getByTestId('progress-bar')).toBeTruthy();
  });

  it('達成率100%のとき progress-fill の幅が100%になる', () => {
    render(
      <WeeklyGoalsWidget
        thisWeekWorkouts={3}
        thisWeekSets={30}
        lastWeekWorkouts={2}
        targetWorkouts={3}
      />,
    );
    const fill = screen.getByTestId('progress-fill');
    // StyleSheet の style は配列またはオブジェクトで取得される
    const style = fill.props.style;
    // フラット化して width を取得
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.width).toBe('100%');
  });

  it('thisWeekWorkouts=0 のとき達成率が0%になる', () => {
    render(
      <WeeklyGoalsWidget
        thisWeekWorkouts={0}
        thisWeekSets={0}
        lastWeekWorkouts={2}
        targetWorkouts={3}
      />,
    );
    const fill = screen.getByTestId('progress-fill');
    const style = fill.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.width).toBe('0%');
  });
});
