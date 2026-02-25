/**
 * MonthCalendar コンポーネントの動作テスト
 *
 * 純粋関数ロジックは MonthCalendar.test.ts でカバー済み。
 * このファイルでは以下をコンポーネントレベルで検証する:
 * - handleDayPress が正しく onDayPress を呼ぶか
 * - enableSwipeMonths={true} が Calendar に渡されるか（スワイプは Calendar 内部で処理）
 * - 矢印ボタンによる月変更で displayMonth が同期されるか
 *
 * react-native-calendars をモックして Calendar の props を capturedCalendarProps に保存し、
 * 任意の操作をシミュレートできるようにする。
 */
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// ==========================================
// react-native-calendars モック
// onDayPress / current / onMonthChange / enableSwipeMonths を capturedCalendarProps に保存し、
// テストから任意の操作をシミュレートできるようにする
// ==========================================
type DateData = { dateString: string };
type CalendarMockProps = {
  onDayPress: (day: DateData) => void;
  onMonthChange?: (month: DateData) => void;
  current?: string;
  enableSwipeMonths?: boolean;
};
let capturedOnDayPress: ((day: DateData) => void) | null = null;
let capturedCalendarProps: CalendarMockProps | null = null;

jest.mock('react-native-calendars', () => ({
  Calendar: (props: CalendarMockProps) => {
    // モックレンダリング: props を丸ごと捕捉する
    capturedCalendarProps = props;
    capturedOnDayPress = props.onDayPress;
    return null;
  },
  LocaleConfig: {
    locales: {},
    defaultLocale: '',
  },
}));

import { MonthCalendar } from '../MonthCalendar';

// ==========================================
// handleDayPress テスト
// ==========================================
describe('MonthCalendar コンポーネント - handleDayPress', () => {
  beforeEach(() => {
    capturedOnDayPress = null;
    capturedCalendarProps = null;
    jest.clearAllMocks();
  });

  it('過去の日付をタップすると onDayPress が呼ばれる', () => {
    // Given: MonthCalendar がレンダリングされている
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    // When: 明らかに過去の日付を押下する
    expect(capturedOnDayPress).not.toBeNull();
    capturedOnDayPress!({ dateString: '2020-01-01' });

    // Then: onDayPress コールバックが '2020-01-01' で呼ばれる
    expect(mockOnDayPress).toHaveBeenCalledWith('2020-01-01');
    expect(mockOnDayPress).toHaveBeenCalledTimes(1);
  });

  it('先月の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    // 2026-01-15（先月）を押下
    capturedOnDayPress!({ dateString: '2026-01-15' });

    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-15');
  });

  it('未来の日付をタップしても onDayPress が呼ばれない', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    // 5年後の日付を押下（明らかに未来）
    capturedOnDayPress!({ dateString: '2031-01-01' });

    expect(mockOnDayPress).not.toHaveBeenCalled();
  });

  it('今日の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    // 今日の日付（テスト実行時点のローカル日付文字列）を押下
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    capturedOnDayPress!({ dateString: todayStr });

    expect(mockOnDayPress).toHaveBeenCalledWith(todayStr);
  });

  it('過去日を複数タップすると、それぞれ onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={mockOnDayPress} />);

    capturedOnDayPress!({ dateString: '2025-12-01' });
    capturedOnDayPress!({ dateString: '2026-01-10' });
    capturedOnDayPress!({ dateString: '2026-02-05' });

    expect(mockOnDayPress).toHaveBeenCalledTimes(3);
    expect(mockOnDayPress).toHaveBeenNthCalledWith(1, '2025-12-01');
    expect(mockOnDayPress).toHaveBeenNthCalledWith(2, '2026-01-10');
    expect(mockOnDayPress).toHaveBeenNthCalledWith(3, '2026-02-05');
  });
});

// ==========================================
// スワイプ・月変更テスト
//
// スワイプは Calendar の enableSwipeMonths={true} で内部処理される。
// テストでは「prop が正しく渡されること」と「月変更が displayMonth に反映されること」を検証する。
// ==========================================
describe('MonthCalendar コンポーネント - スワイプ・月変更', () => {
  beforeEach(() => {
    capturedCalendarProps = null;
    jest.clearAllMocks();
  });

  it('Calendar に enableSwipeMonths={true} が渡される', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    // react-native-calendars 標準のスワイプ機能を有効化していることを確認
    expect(capturedCalendarProps?.enableSwipeMonths).toBe(true);
  });

  it('初期表示月は当月の1日（2026-02-01）', () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);
    expect(capturedCalendarProps?.current).toBe('2026-02-01');
  });

  it('矢印ボタンの月変更で displayMonth が同期される', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    // Calendar の onMonthChange（矢印ボタン押下時に呼ばれる）をシミュレート
    act(() => {
      capturedCalendarProps?.onMonthChange?.({ dateString: '2025-12-01' });
    });

    // displayMonth が矢印ボタンの月に更新された
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2025-12-01');
    });
  });

  it('月変更時に onMonthChange コールバックが呼ばれる', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    act(() => {
      capturedCalendarProps?.onMonthChange?.({ dateString: '2026-01-01' });
    });

    expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
  });
});
