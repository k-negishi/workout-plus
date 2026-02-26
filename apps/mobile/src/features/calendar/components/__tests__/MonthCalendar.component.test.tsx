/**
 * MonthCalendar コンポーネントの動作テスト（ScrollView 3パネル方式）
 *
 * 設計: ScrollView (horizontal, pagingEnabled) で 3 つのカレンダーパネル ([前月][当月][翌月]) を並べる。
 * ページ変更後は中央 (index 1) にリセットして無限スクロールを実現する。
 *
 * #171 対応: containerWidth は初期値 0 で、onLayout 計測後に ScrollView をマウントする。
 * テストでは renderWithLayout ヘルパーで onLayout を発火させ、実運用と同じ状態を再現する。
 *
 * テスト対象:
 * - カスタムヘッダーの月名表示・矢印ボタン操作
 * - ScrollView の onMomentumScrollEnd によるスワイプ月変更
 * - 当月から翌月方向への移動制限 (#164-C1, #164-C2)
 * - handleDayPress が正しく onDayPress を呼ぶか (#164-D1)
 * - 3 パネル分の Calendar が描画されるか
 * - 初期表示フラッシュ防止 (#171)
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

import type { MonthCalendarProps } from '../MonthCalendar';
import { MonthCalendar } from '../MonthCalendar';

// onLayout で幅を通知しないと ScrollView がマウントされないため (#171)、
// テスト用ヘルパーで render + onLayout を一括で行う
const MOCK_LAYOUT_WIDTH = 353;

function renderWithLayout(props: Partial<MonthCalendarProps> = {}) {
  const defaultProps: MonthCalendarProps = {
    trainingDates: [],
    selectedDate: null,
    onDayPress: jest.fn(),
    ...props,
  };
  render(<MonthCalendar {...defaultProps} />);

  // onLayout を発火して containerWidth をセットし、ScrollView をマウントさせる
  const container = screen.getByTestId('calendar-container');
  fireEvent(container, 'layout', {
    nativeEvent: { layout: { width: MOCK_LAYOUT_WIDTH, height: 400 } },
  });
}

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
    renderWithLayout();
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('← ボタンを押すと前月に移動する', async () => {
    renderWithLayout();

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
    renderWithLayout();

    const nextButton = screen.getByTestId('next-month-button');
    // Pressable の disabled は accessibilityState.disabled または aria-disabled で表れる
    expect(nextButton.props.accessibilityState?.disabled ?? nextButton.props.disabled).toBe(true);
  });

  it('当月表示中に → ボタンを押しても月が変わらない (#164-C1)', () => {
    const mockOnMonthChange = jest.fn();
    renderWithLayout({ onMonthChange: mockOnMonthChange });

    fireEvent.press(screen.getByTestId('next-month-button'));
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(mockOnMonthChange).not.toHaveBeenCalled();
    expect(screen.getByText('2026年2月')).toBeTruthy();
  });

  it('前月に移動してから → ボタンで翌月（当月）に戻れる', async () => {
    renderWithLayout();

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
    renderWithLayout({ onMonthChange: mockOnMonthChange });

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
// 2重ジャンプ防止テスト
// 矢印ボタン押下中に onMomentumScrollEnd が来ても月変更は1回だけ
// ==========================================
describe('MonthCalendar - アニメーション中の多重発火防止', () => {
  it('矢印ボタン押下中に onMomentumScrollEnd が発火しても月は1回しか変わらない', async () => {
    const mockOnMonthChange = jest.fn();
    renderWithLayout({ onMonthChange: mockOnMonthChange });

    // 矢印ボタンを押す（isAnimatingRef.current = true が同期でセットされるべき）
    fireEvent.press(screen.getByTestId('prev-month-button'));

    // アニメーション中に onMomentumScrollEnd が発火するシミュレーション
    // （pagingEnabled ScrollView が scrollTo animated:true に反応するケース）
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });

    // すべてのタイマーを進める
    act(() => {
      jest.runAllTimers();
    });

    // 2ヶ月送り（12月）ではなく1ヶ月送り（1月）であること
    await waitFor(() => {
      expect(screen.getByText('2026年1月')).toBeTruthy();
    });
    // onMonthChange が1回だけ呼ばれる（2回は NG）
    expect(mockOnMonthChange).toHaveBeenCalledTimes(1);
    expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
  });
});

// ==========================================
// スクロール（スワイプ）テスト
// ==========================================
const MOCK_CONTAINER_WIDTH = MOCK_LAYOUT_WIDTH;

describe('MonthCalendar - スワイプ月変更', () => {
  it('左端にスクロールすると前月に移動する (#164-S1)', async () => {
    renderWithLayout();

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
    renderWithLayout({ onMonthChange: mockOnMonthChange });

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
    renderWithLayout();

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
    renderWithLayout({ onMonthChange: mockOnMonthChange });

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
    renderWithLayout({ onDayPress: mockOnDayPress });

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
    renderWithLayout({ onDayPress: mockOnDayPress });

    const centerCalendar = mockCalendarInstances[1];
    centerCalendar!.onDayPress({ dateString: '2031-01-01' });

    expect(mockOnDayPress).not.toHaveBeenCalled();
  });

  it('今日の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    renderWithLayout({ onDayPress: mockOnDayPress });

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
    renderWithLayout();
    expect(mockCalendarInstances).toHaveLength(3);
  });

  it('左パネルに前月（2026-01-01）が設定される', () => {
    renderWithLayout();
    expect(mockCalendarInstances[0]?.current).toBe('2026-01-01');
  });

  it('中央パネルに当月（2026-02-01）が設定される', () => {
    renderWithLayout();
    expect(mockCalendarInstances[1]?.current).toBe('2026-02-01');
  });

  it('右パネルに翌月（2026-03-01）が設定される', () => {
    renderWithLayout();
    expect(mockCalendarInstances[2]?.current).toBe('2026-03-01');
  });

  it('各 Calendar パネルに hideArrows={true} が設定される（内部矢印を非表示）', () => {
    renderWithLayout();
    for (const instance of mockCalendarInstances) {
      expect(instance.hideArrows).toBe(true);
    }
  });

  it('各 Calendar パネルに enableSwipeMonths={false} が設定される（ScrollView がスワイプを担う）', () => {
    renderWithLayout();
    for (const instance of mockCalendarInstances) {
      expect(instance.enableSwipeMonths).toBe(false);
    }
  });
});

// ==========================================
// Issue #171: 初期表示フラッシュ防止テスト
// containerWidth = 0 で開始し、onLayout 計測後に ScrollView をマウントする
// ==========================================
describe('MonthCalendar - 初期表示フラッシュ防止 (#171)', () => {
  it('onLayout 前は ScrollView がマウントされない', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(screen.queryByTestId('month-calendar-scroll')).toBeNull();
  });

  it('onLayout 後に ScrollView がマウントされカレンダーが表示される', () => {
    renderWithLayout();
    expect(screen.getByTestId('month-calendar-scroll')).toBeTruthy();
  });

  it('onLayout で計測された幅が contentOffset に反映される', () => {
    renderWithLayout();
    const scrollView = screen.getByTestId('month-calendar-scroll');
    expect(scrollView.props.contentOffset).toEqual({ x: MOCK_LAYOUT_WIDTH, y: 0 });
  });
});
