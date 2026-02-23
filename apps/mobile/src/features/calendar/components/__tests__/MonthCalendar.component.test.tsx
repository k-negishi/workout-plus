/**
 * MonthCalendar コンポーネントの動作テスト
 *
 * 純粋関数ロジックは MonthCalendar.test.ts でカバー済み。
 * このファイルでは「handleDayPress が正しく onDayPress を呼ぶか」という
 * コンポーネントレベルの振る舞いを検証する。
 *
 * react-native-calendars をモックして Calendar の onDayPress / current props を捕捉し、
 * 任意の操作をシミュレートできるようにする。
 */
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { PanResponder } from 'react-native';

// ==========================================
// react-native-calendars モック
// onDayPress / current / onMonthChange を capturedCalendarProps に保存し、
// テストから任意の操作をシミュレートできるようにする
// ==========================================
type DateData = { dateString: string };
type CalendarMockProps = {
  onDayPress: (day: DateData) => void;
  onMonthChange?: (month: DateData) => void;
  current?: string;
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
// PanResponder ハンドラーキャプチャ用の型
// ==========================================
type GestureState = { dx: number; dy: number };
type PanHandlers = {
  onMoveShouldSetPanResponder?: (e: unknown, gs: GestureState) => boolean;
  onPanResponderRelease?: (e: unknown, gs: GestureState) => void;
};

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

describe('MonthCalendar コンポーネント - フリックジェスチャー', () => {
  // PanResponder.create に渡された config を捕捉するためのスパイ
  let capturedPanHandlers: PanHandlers = {};
  let panCreateSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedPanHandlers = {};
    capturedCalendarProps = null;
    jest.clearAllMocks();

    // PanResponder.create をスパイして handlers を捕捉する
    // spyOn は render() よりも前に設定する必要がある
    panCreateSpy = jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
      capturedPanHandlers = config as PanHandlers;
      // panHandlers プロパティを返す（実際には何もしない）
      return { panHandlers: {} } as ReturnType<typeof PanResponder.create>;
    });
  });

  afterEach(() => {
    panCreateSpy.mockRestore();
  });

  it('右フリック（dx=100）で前月に移動する', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // 初期表示月は当月の1日（2026-02-01）
    expect(capturedCalendarProps?.current).toBe('2026-02-01');

    // 右フリック: 前月へ移動
    act(() => {
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: 100, dy: 0 });
    });

    // 前月（2026-01-01）に移動した
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-01-01');
    });
    expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
  });

  it('左フリック（dx=-100）で翌月に移動する（過去月から）', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // まず右フリックで先月へ移動する
    act(() => {
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: 100, dy: 0 });
    });
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-01-01');
    });

    // 左フリックで翌月（当月）に戻る
    act(() => {
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: -100, dy: 0 });
    });
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-02-01');
    });
    expect(mockOnMonthChange).toHaveBeenLastCalledWith('2026-02-01');
  });

  it('当月（2026-02）から左フリックしても未来月には移動しない', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // 初期表示月は当月（2026-02-01）
    const initialCurrent = capturedCalendarProps?.current;
    expect(initialCurrent).toBe('2026-02-01');

    // 左フリック: 翌月（未来）への移動を試みる
    act(() => {
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: -100, dy: 0 });
    });

    // current は変わらない（未来月への移動はブロックされる）
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-02-01');
    });
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });

  it('移動量が小さい（dx=30）ときはフリックとして認識しない', async () => {
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
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: 30, dy: 0 });
    });

    // current は変わらない
    expect(capturedCalendarProps?.current).toBe('2026-02-01');
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });

  it('縦スクロール（|dy| > |dx|）では月移動が発動しない', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // 縦方向の移動が支配的なジェスチャー
    act(() => {
      capturedPanHandlers.onPanResponderRelease?.(null, { dx: 30, dy: 80 });
    });

    expect(capturedCalendarProps?.current).toBe('2026-02-01');
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });

  it('矢印ボタンの月変更で displayMonth が同期される', async () => {
    render(
      <MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />,
    );

    // Calendar の onMonthChange（矢印ボタン押下時に呼ばれる）をシミュレート
    act(() => {
      capturedCalendarProps?.onMonthChange?.({ dateString: '2025-12-01' });
    });

    // その後フリックしても displayMonth が矢印ボタンの月を基準にして動く
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2025-12-01');
    });
  });
});
