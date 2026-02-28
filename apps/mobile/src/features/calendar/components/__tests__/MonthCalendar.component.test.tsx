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
 * - 矢印ボタン後の遅延 onMomentumScrollEnd を無視する（Issue #196 Bug 1）
 * - 前後月オーバーフロー日付タップで表示月が切り替わる（Issue #196 Bug 2）
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
  markedDates?: Record<string, unknown>;
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
// テスト全体の日付を 2026-02-21 に固定する
// jest.useFakeTimers() の後に呼ぶことで Date も偽装される
jest.setSystemTime(new Date(2026, 1, 21));

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
  // clearAllTimers は SystemTime をリセットするため、直後に再設定する
  jest.clearAllTimers();
  jest.setSystemTime(new Date(2026, 1, 21));
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
// Issue #196 Bug 1: 矢印ボタン後の遅延 onMomentumScrollEnd を無視する
// タイマー完了後（isAnimatingRef.current = false 後）に onMomentumScrollEnd が
// 遅れて発火しても月が追加変更されないことを保証する
// ==========================================
describe('MonthCalendar - 矢印ボタン後の遅延 onMomentumScrollEnd を無視する (Issue #196)', () => {
  it('タイマー完了後に onMomentumScrollEnd が発火しても月が追加変更されない', async () => {
    const mockOnMonthChange = jest.fn();
    renderWithLayout({ onMonthChange: mockOnMonthChange });

    // 矢印ボタンを押す
    fireEvent.press(screen.getByTestId('prev-month-button'));

    // すべてのタイマーを進める（300ms + setTimeout(0) → isAnimatingRef.current = false になる）
    act(() => {
      jest.runAllTimers();
    });

    // 1ヶ月前（2026年1月）に移動済みであることを確認
    await waitFor(() => {
      expect(screen.getByText('2026年1月')).toBeTruthy();
    });

    // タイマー完了後に遅れて onMomentumScrollEnd が発火するシミュレーション
    // （iOS では矢印ボタンの scrollTo animated:true のモメンタムが後から発火するケース）
    // ユーザーのドラッグ操作でないため isUserDraggingRef = false のはず → 無視されるべき
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });

    act(() => {
      jest.runAllTimers();
    });

    // 2ヶ月飛び（2025年12月）にならず、1月のまま
    expect(screen.getByText('2026年1月')).toBeTruthy();
    // onMonthChange は1回だけ（2回目は NG）
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

    // onScrollBeginDrag でスワイプ開始を登録してから momentumScrollEnd を発火
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
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

    // onScrollBeginDrag でスワイプ開始を登録してから momentumScrollEnd を発火
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
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
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('2026年1月')).toBeTruthy();

    // 翌月方向にスクロール（2月）
    mockCalendarInstances = [];
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
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

    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
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
    // 別月の過去日付タップは startMonthAnimation も呼ぶため act() でラップする
    act(() => {
      centerCalendar!.onDayPress({ dateString: '2020-01-01' });
    });

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
// Issue #196 Bug 2: 前後月オーバーフロー日付タップで表示月が自動切り替えされる
// ==========================================
describe('MonthCalendar - 前後月オーバーフロー日付タップで表示月が切り替わる (Issue #196)', () => {
  beforeEach(() => {
    mockCalendarInstances = [];
  });

  it('当月カレンダーで前月の日付をタップすると前月に切り替わる', async () => {
    const mockOnDayPress = jest.fn();
    renderWithLayout({ onDayPress: mockOnDayPress });

    // 中央パネル（当月 = 2月）で 1/28 をタップ（2月カレンダーの前月オーバーフロー日付）
    const centerCalendar = mockCalendarInstances[1];
    expect(centerCalendar).toBeDefined();
    // startMonthAnimation が setIsAnimating を同期で呼ぶため act() でラップする
    act(() => {
      centerCalendar!.onDayPress({ dateString: '2026-01-28' });
    });

    act(() => {
      jest.runAllTimers();
    });

    // 表示月が前月（1月）に切り替わること
    await waitFor(() => {
      expect(screen.getByText('2026年1月')).toBeTruthy();
    });
    // onDayPress はタップした日付で呼ばれること
    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-28');
  });

  it('前後月日付タップ時に onMonthChange は呼ばれない（selectedDate の上書きを防ぐため）', () => {
    const mockOnDayPress = jest.fn();
    const mockOnMonthChange = jest.fn();
    renderWithLayout({ onDayPress: mockOnDayPress, onMonthChange: mockOnMonthChange });

    const centerCalendar = mockCalendarInstances[1];
    act(() => {
      centerCalendar!.onDayPress({ dateString: '2026-01-28' });
    });

    act(() => {
      jest.runAllTimers();
    });

    // onMonthChange は呼ばれない（selectedDate が 1/1 に上書きされるのを防ぐため）
    expect(mockOnMonthChange).not.toHaveBeenCalled();
    // onDayPress はタップした日付で呼ばれること
    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-28');
  });

  it('前月表示中に翌月の日付をタップすると翌月に切り替わる', async () => {
    const mockOnDayPress = jest.fn();
    renderWithLayout({ onDayPress: mockOnDayPress });

    // まず前月（1月）に移動
    mockCalendarInstances = [];
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'scrollBeginDrag');
    fireEvent(screen.getByTestId('month-calendar-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('2026年1月')).toBeTruthy();

    // 1月表示中の中央パネルで 2/1 をタップ（翌月オーバーフロー日付）
    // momentumScrollEnd 後の re-render でインスタンスが更新されている
    const centerCalendar = mockCalendarInstances[1];
    expect(centerCalendar).toBeDefined();
    act(() => {
      centerCalendar!.onDayPress({ dateString: '2026-02-01' });
    });

    act(() => {
      jest.runAllTimers();
    });

    // 表示月が翌月（2月）に切り替わること
    await waitFor(() => {
      expect(screen.getByText('2026年2月')).toBeTruthy();
    });
    expect(mockOnDayPress).toHaveBeenCalledWith('2026-02-01');
  });

  it('当月カレンダーで翌月の日付をタップしても月が変わらない（翌月移動制限）', () => {
    const mockOnMonthChange = jest.fn();
    renderWithLayout({ onMonthChange: mockOnMonthChange });

    // 当月（2月）表示中に翌月（3月）の日付をタップ
    // → 翌月移動制限により月は変わらない（3月は未来なので未来日判定もかかる）
    const centerCalendar = mockCalendarInstances[1];
    centerCalendar!.onDayPress({ dateString: '2026-03-01' });

    act(() => {
      jest.runAllTimers();
    });

    // 翌月（3月）は未来日なので onDayPress が呼ばれず、月も変わらない
    expect(screen.getByText('2026年2月')).toBeTruthy();
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });
});

// ==========================================
// Issue #173: selectedDate 変更時の即座反映テスト
// selectedDate が変わった時に Calendar が再マウントされ、青丸が即座に表示されることを保証する
// ==========================================
describe('MonthCalendar - selectedDate 変更時の即座反映 (#173)', () => {
  beforeEach(() => {
    mockCalendarInstances = [];
  });

  it('初期描画時に selectedDate が Calendar の markedDates に反映される', () => {
    renderWithLayout({ selectedDate: '2026-02-10' });

    // 中央パネル（当月）の markedDates に選択日が含まれること
    const centerCalendar = mockCalendarInstances[1];
    expect(centerCalendar).toBeDefined();
    const markedDates = centerCalendar!.markedDates as Record<string, { selectedColor?: string }>;
    expect(markedDates['2026-02-10']?.selectedColor).toBe('#4D94FF');
  });

  it('selectedDate が変わると Calendar の markedDates が即座に更新される', async () => {
    const { rerender } = render(
      <MonthCalendar trainingDates={[]} selectedDate="2026-02-10" onDayPress={jest.fn()} />,
    );

    // onLayout を発火して ScrollView をマウントする
    const container = screen.getByTestId('calendar-container');
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { width: MOCK_LAYOUT_WIDTH, height: 400 } },
    });

    // selectedDate を '2026-02-15' に変更する
    mockCalendarInstances = [];
    rerender(<MonthCalendar trainingDates={[]} selectedDate="2026-02-15" onDayPress={jest.fn()} />);

    // 変更後の markedDates が即座に更新されること（遅延なし）
    const centerCalendar = mockCalendarInstances[1];
    expect(centerCalendar).toBeDefined();
    const markedDates = centerCalendar!.markedDates as Record<string, { selectedColor?: string }>;
    // 新しい選択日に青丸が設定される
    expect(markedDates['2026-02-15']?.selectedColor).toBe('#4D94FF');
    // 旧選択日の青丸が消える（trainingDate でない場合はエントリなし）
    expect(markedDates['2026-02-10']?.selectedColor).not.toBe('#4D94FF');
  });

  it('selectedDate 変更時に Calendar が再マウントされる（key が selectedDate を含む）', async () => {
    // react-native-calendars は markedDates prop の変更を内部状態に即座に反映しない既知の問題がある。
    // key を selectedDate に基づいて変えることで強制再マウントし、青丸が即座に表示されることを保証する。
    const { rerender } = render(
      <MonthCalendar trainingDates={[]} selectedDate="2026-02-10" onDayPress={jest.fn()} />,
    );

    const container = screen.getByTestId('calendar-container');
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { width: MOCK_LAYOUT_WIDTH, height: 400 } },
    });

    // 初期描画: 3パネル描画
    expect(mockCalendarInstances).toHaveLength(3);

    // selectedDate を変更する前の mockCalendarInstances をクリア
    // （再マウントなら再度 push されるはず）
    const instancesBefore = [...mockCalendarInstances];
    mockCalendarInstances = [];

    rerender(<MonthCalendar trainingDates={[]} selectedDate="2026-02-15" onDayPress={jest.fn()} />);

    // selectedDate が変わると Calendar が再マウントされ（3パネル分）、
    // 新しい markedDates を持つインスタンスが作られる
    expect(mockCalendarInstances).toHaveLength(3);

    // 新しいインスタンスの markedDates は新しい selectedDate を反映している
    const newCenterCalendar = mockCalendarInstances[1];
    expect(newCenterCalendar).toBeDefined();
    const newMarkedDates = newCenterCalendar!.markedDates as Record<
      string,
      { selectedColor?: string }
    >;
    // 新しい選択日に青丸が設定される
    expect(newMarkedDates['2026-02-15']?.selectedColor).toBe('#4D94FF');

    // 旧インスタンスとは異なる markedDates を持つ（再マウントされた証拠）
    const oldCenterCalendar = instancesBefore[1];
    const oldMarkedDates = oldCenterCalendar!.markedDates as Record<
      string,
      { selectedColor?: string }
    >;
    expect(oldMarkedDates['2026-02-10']?.selectedColor).toBe('#4D94FF');
    // 新しいインスタンスでは旧選択日の青丸が消えている
    expect(newMarkedDates['2026-02-10']?.selectedColor).not.toBe('#4D94FF');
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
