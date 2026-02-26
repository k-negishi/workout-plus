/**
 * OnTrackBadge テスト
 *
 * - 順調（weeklyWorkouts >= 1）のとき「順調」バッジを表示する
 * - 順調でない（weeklyWorkouts === 0）のとき何も表示しない
 */
import { render, screen } from '@testing-library/react-native';

import { OnTrackBadge } from '../OnTrackBadge';

describe('OnTrackBadge', () => {
  it('weeklyWorkouts >= 1 のとき「順調」テキストを表示する', () => {
    render(<OnTrackBadge weeklyWorkouts={1} />);
    expect(screen.getByText('順調')).toBeTruthy();
  });

  it('weeklyWorkouts >= 3 のとき「順調」テキストを表示する', () => {
    render(<OnTrackBadge weeklyWorkouts={3} />);
    expect(screen.getByText('順調')).toBeTruthy();
  });

  it('weeklyWorkouts === 0 のとき何も表示しない', () => {
    const { toJSON } = render(<OnTrackBadge weeklyWorkouts={0} />);
    expect(toJSON()).toBeNull();
  });

  it('testID="on-track-badge" が設定される（順調時）', () => {
    render(<OnTrackBadge weeklyWorkouts={2} />);
    expect(screen.getByTestId('on-track-badge')).toBeTruthy();
  });
});
