/**
 * MonthCalendar コンポーネントの動作テスト（ScrollView 3パネル方式）
 *
 * 設計: ScrollView (horizontal, pagingEnabled) で 3 つのカレンダーパネル ([前月][当月][翌月]) を並べる。
 * ページ変更後は中央 (index 1) にリセットして無限スクロールを実現する。
 *
 * テスト対象:
 * - カスタムヘッダーの月名表示・矢印ボタン操作
 * - ScrollView の onMomentumScrollEnd によるスワイプ月変更
 * - 当月から翌月方向への移動制限 (#164-C1, #164-C2)
 * - handleDayPress が正しく onDayPress を呼ぶか (#164-D1)
 * - 3 パネル分の Calendar が描画されるか
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// ==========================================
// react-native-calendars モック
// ==========================================
type DateData = { dateString: string };
type CalendarMockProps = {
  onDayPress: (day: DateData) => void;
  onMonthChange?: (month: DateData) => void;
  current?: string;
  enableSwipeMonths?: boolean;
  hideArrows?: boolean;
};

// mock prefix により jest.mock() factory 内でのクロージャ参照が許可される
// （詳細: .claude/rules/react-navigation-testing.md）
let mockCalendarInstances: CalendarMockProps[] = [];

jest.mock('react-native-calendars', () => ({
  Calendar: (props: CalendarMockProps) => {
    mockCalendarInstances.push(props);
    return null;
  },
  LocaleConfig: {
    locales: {},
    defaultLocale: '',
  },
}));

// faker timers を使用（矢印ボタンの setTimeout 300ms を制御するため）
jest.useFakeTimers();

import { MonthCalendar } from '../MonthCalendar';

beforeEach(() => {
  mockCalendarInstances = [];
  jest.clearAllMocks();
  // タイマーをリセット
  jest.clearAllTimers();
});

// ==========================================
// カスタムヘッダーテスト
// ==========================================
describe('MonthCalendar - カスタムヘッダー', () => {
  it('現在の月が日本語フォーマットで表示される（2026年2月）', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('← ボタンを押すと前月に移動する', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    fireEvent.press(screen.getByTestId('prev-month-button'));

    // アニメーション完了（300ms）後に月が更新される
    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('2026年1月')).toBeTruthy();
    });
  });

  it('当月表示中に → ボタンが disabled になる (#164-C1)', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    const nextButton = screen.getByTestId('next-month-button');
    // Pressable の disabled は accessibilityState.disabled または aria-disabled で表れる
    expect(nextButton.props.accessibilityState?.disabled ?? nextButton.props.disabled).toBe(true);
  });

  it('当月表示中に → ボタンを押しても月が変わらない (#164-C1)', () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    fireEvent.press(screen.getByTestId('next-month-button'));
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(mockOnMonthChange).not.toHaveBeenCalled();
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('前月に移動してから → ボタンで翌月（当月）に戻れる', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    // 前月（1月）に移動
    fireEvent.press(screen.getByTestId('prev-month-button'));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(screen.getByText('2026年1月')).toBeTruthy();

    // 翌月（2月）に移動
    mockCalendarInstances = [];
    fireEvent.press(screen.getByTestId('next-month-button'));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('月変更後に onMonthChange コールバックが呼ばれる', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    fireEvent.press(screen.getByTestId('prev-month-button'));
    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
    });
  });
});

// ==========================================
// スクロール（スワイプ）テスト
// React Native テスト環境では Dimensions.get('window').width = 750
// ==========================================
const MOCK_CONTAINER_WIDTH = 750;

describe('MonthCalendar - スワイプ月変更', () => {
  it('左端にスクロールすると前月に移動する (#164-S1)', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    // index 0 (前月方向) にスクロール
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });

    // setTimeout(0) のため、次フレームを待つ
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText('2026年1月')).toBeTruthy();
    });
  });

  it('右端にスクロールしても当月の場合は翌月に移動しない (#164-C2)', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // index 2 (翌月方向) にスクロール（当月なのでブロックされる）
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: MOCK_CONTAINER_WIDTH * 2 } },
    });

    act(() => {
      jest.runAllTimers();
    });

    // 月変更コールバックが呼ばれない
    expect(mockOnMonthChange).not.toHaveBeenCalled();
    // 当月表示のまま
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('前月表示中に右端スクロールで翌月（当月）に移動できる', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    // まず前月（1月）に移動
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('2026年1月')).toBeTruthy();

    // 翌月方向にスクロール（2月）
    mockCalendarInstances = [];
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: MOCK_CONTAINER_WIDTH * 2 } },
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('スワイプ月変更後に onMonthChange コールバックが呼ばれる', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
    });
  });
});

// ==========================================
// handleDayPress テスト (#164-D1)
// スライドアニメーション後も日付タップが動作することを保証する
// ==========================================
describe('MonthCalendar コンポーネント - handleDayPress', () => {
  beforeEach(() => {
    mockCalendarInstances = [];
  });

  it('過去の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    // 中央パネル（index 1）の Calendar からタップをシミュレート
    // 3パネル描画されるため、[0]=前月, [1]=当月, [2]=翌月
    const centerCalendar = mockCalendarInstances[1];
    expect(centerCalendar).toBeDefined();
    centerCalendar!.onDayPress({ dateString: '2020-01-01' });

    expect(mockOnDayPress).toHaveBeenCalledWith('2020-01-01');
    expect(mockOnDayPress).toHaveBeenCalledTimes(1);
  });

  it('未来の日付をタップしても onDayPress が呼ばれない', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    const centerCalendar = mockCalendarInstances[1];
    centerCalendar!.onDayPress({ dateString: '2031-01-01' });

    expect(mockOnDayPress).not.toHaveBeenCalled();
  });

  it('今日の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const centerCalendar = mockCalendarInstances[1];
    centerCalendar!.onDayPress({ dateString: todayStr });

    expect(mockOnDayPress).toHaveBeenCalledWith(todayStr);
  });
});

// ==========================================
// Calendar パネル設定テスト
// ==========================================
describe('MonthCalendar - Calendar パネル設定', () => {
  beforeEach(() => {
    mockCalendarInstances = [];
  });

  it('3 つの Calendar パネルが描画される', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(mockCalendarInstances).toHaveLength(3);
  });

  it('左パネルに前月（2026-01-01）が設定される', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(mockCalendarInstances[0]?.current).toBe('2026-01-01');
  });

  it('中央パネルに当月（2026-02-01）が設定される', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(mockCalendarInstances[1]?.current).toBe('2026-02-01');
  });

  it('右パネルに翌月（2026-03-01）が設定される', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(mockCalendarInstances[2]?.current).toBe('2026-03-01');
  });

  it('各 Calendar パネルに hideArrows={true} が設定される（内部矢印を非表示）', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    for (const instance of mockCalendarInstances) {
      expect(instance.hideArrows).toBe(true);
    }
  });

  it('各 Calendar パネルに enableSwipeMonths={false} が設定される（ScrollView がスワイプを担う）', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    for (const instance of mockCalendarInstances) {
      expect(instance.enableSwipeMonths).toBe(false);
    }
  });
});
