/**
 * MonthCalendar コンポーネントの動作テスト
 *
 * 純粋関数ロジックは MonthCalendar.test.ts でカバー済み。
 * このファイルでは「handleDayPress が正しく onDayPress を呼ぶか」と
 * 「スワイプで月が切り替わるか」をコンポーネントレベルで検証する。
 *
 * react-native-calendars をモックして Calendar の onDayPress / current props を捕捉し、
 * 任意の操作をシミュレートできるようにする。
 *
 * react-native-gesture-handler の Gesture.Pan() は jest.mock でモックし、
 * onEnd コールバックをテストから直接呼び出す。
 */
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

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

// ==========================================
// react-native-gesture-handler モック
// Gesture.Pan() の onEnd コールバックをテストから呼び出せるようにする
//
// ホイスティング対策: gestureStore はオブジェクトのプロパティとして保持し、
// onEnd 内でプロパティ代入することで stale closure を回避する
// ==========================================
const gestureStore: {
  onEnd: ((e: { translationX: number; translationY: number }) => void) | null;
} = { onEnd: null };

jest.mock('react-native-gesture-handler', () => {
  // メソッドチェーン対応のモックジェスチャーオブジェクトを生成するファクトリ
  // 各メソッドは自身を返すため .runOnJS().activeOffsetX().failOffsetY().onEnd() が動作する
  const makeMockGesture = (): Record<string, unknown> => {
    const g: Record<string, unknown> = {};
    g['runOnJS'] = () => g;
    g['activeOffsetX'] = () => g;
    g['failOffsetY'] = () => g;
    // onEnd: コールバックを gestureStore に保存（クロージャにより test 実行時に評価される）
    g['onEnd'] = (cb: (e: { translationX: number; translationY: number }) => void) => {
      gestureStore.onEnd = cb;
      return g;
    };
    return g;
  };

  return {
    Gesture: {
      Pan: () => makeMockGesture(),
    },
    // GestureDetector は children をそのまま描画する no-op
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { MonthCalendar } from '../MonthCalendar';

// ==========================================
// handleDayPress テスト
// ==========================================
describe('MonthCalendar コンポーネント - handleDayPress', () => {
  beforeEach(() => {
    capturedOnDayPress = null;
    capturedCalendarProps = null;
    gestureStore.onEnd = null;
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
// スワイプジェスチャー（Gesture.Pan）テスト
// ==========================================
describe('MonthCalendar コンポーネント - スワイプジェスチャー', () => {
  beforeEach(() => {
    capturedCalendarProps = null;
    gestureStore.onEnd = null;
    jest.clearAllMocks();
  });

  it('右スワイプ（translationX=100）で前月に移動する', async () => {
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
    expect(gestureStore.onEnd).not.toBeNull();

    // 右スワイプ: 前月へ移動
    act(() => {
      gestureStore.onEnd!({ translationX: 100, translationY: 0 });
    });

    // 前月（2026-01-01）に移動した
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-01-01');
    });
    expect(mockOnMonthChange).toHaveBeenCalledWith('2026-01-01');
  });

  it('左スワイプ（translationX=-100）で翌月に移動する（過去月から）', async () => {
    const mockOnMonthChange = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={jest.fn()}
        onMonthChange={mockOnMonthChange}
      />,
    );

    // まず右スワイプで先月へ移動する
    act(() => {
      gestureStore.onEnd!({ translationX: 100, translationY: 0 });
    });
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-01-01');
    });

    // 左スワイプで翌月（当月）に戻る
    act(() => {
      gestureStore.onEnd!({ translationX: -100, translationY: 0 });
    });
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-02-01');
    });
    expect(mockOnMonthChange).toHaveBeenLastCalledWith('2026-02-01');
  });

  it('当月（2026-02）から左スワイプしても未来月には移動しない', async () => {
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
    expect(capturedCalendarProps?.current).toBe('2026-02-01');

    // 左スワイプ: 翌月（未来）への移動を試みる
    act(() => {
      gestureStore.onEnd!({ translationX: -100, translationY: 0 });
    });

    // current は変わらない（未来月への移動はブロックされる）
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2026-02-01');
    });
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });

  it('移動量が小さい（translationX=30）ときはスワイプとして認識しない', async () => {
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
      gestureStore.onEnd!({ translationX: 30, translationY: 0 });
    });

    // current は変わらない
    expect(capturedCalendarProps?.current).toBe('2026-02-01');
    expect(mockOnMonthChange).not.toHaveBeenCalled();
  });

  it('矢印ボタンの月変更で displayMonth が同期される', async () => {
    render(<MonthCalendar trainingDates={[]} selectedDate={null} onDayPress={jest.fn()} />);

    // Calendar の onMonthChange（矢印ボタン押下時に呼ばれる）をシミュレート
    act(() => {
      capturedCalendarProps?.onMonthChange?.({ dateString: '2025-12-01' });
    });

    // その後スワイプしても displayMonth が矢印ボタンの月を基準にして動く
    await waitFor(() => {
      expect(capturedCalendarProps?.current).toBe('2025-12-01');
    });
  });
});
