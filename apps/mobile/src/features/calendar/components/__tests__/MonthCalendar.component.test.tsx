/**
 * MonthCalendar コンポーネントの動作テスト
 *
 * 純粋関数ロジックは MonthCalendar.test.ts でカバー済み。
 * このファイルでは「handleDayPress が正しく onDayPress を呼ぶか」という
 * コンポーネントレベルの振る舞いを検証する。
 *
 * react-native-calendars をモックして Calendar の onDayPress prop を捕捉し、
 * 任意の日付押下をシミュレートする。
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// ==========================================
// react-native-calendars モック
// onDayPress を capturedOnDayPress に保存し、
// テストから任意の日付押下をシミュレートできるようにする
// ==========================================
type DateData = { dateString: string };
let capturedOnDayPress: ((day: DateData) => void) | null = null;

jest.mock('react-native-calendars', () => ({
  Calendar: ({ onDayPress }: { onDayPress: (day: DateData) => void }) => {
    // モックレンダリング: onDayPress を捕捉するだけ
    capturedOnDayPress = onDayPress;
    return null;
  },
  LocaleConfig: {
    locales: {},
    defaultLocale: '',
  },
}));

import { MonthCalendar } from '../MonthCalendar';

describe('MonthCalendar コンポーネント - handleDayPress', () => {
  beforeEach(() => {
    capturedOnDayPress = null;
    jest.clearAllMocks();
  });

  it('過去の日付をタップすると onDayPress が呼ばれる', () => {
    // Given: MonthCalendar がレンダリングされている
    const mockOnDayPress = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={mockOnDayPress}
      />,
    );

    // When: 明らかに過去の日付を押下する
    expect(capturedOnDayPress).not.toBeNull();
    capturedOnDayPress!({ dateString: '2020-01-01' });

    // Then: onDayPress コールバックが '2020-01-01' で呼ばれる
    expect(mockOnDayPress).toHaveBeenCalledWith('2020-01-01');
    expect(mockOnDayPress).toHaveBeenCalledTimes(1);
  });

  it('先月の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={mockOnDayPress}
      />,
    );

    // 2026-01-15（先月）を押下
    capturedOnDayPress!({ dateString: '2026-01-15' });

    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-15');
  });

  it('未来の日付をタップしても onDayPress が呼ばれない', () => {
    const mockOnDayPress = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={mockOnDayPress}
      />,
    );

    // 5年後の日付を押下（明らかに未来）
    capturedOnDayPress!({ dateString: '2031-01-01' });

    expect(mockOnDayPress).not.toHaveBeenCalled();
  });

  it('今日の日付をタップすると onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={mockOnDayPress}
      />,
    );

    // 今日の日付（テスト実行時点のローカル日付文字列）を押下
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    capturedOnDayPress!({ dateString: todayStr });

    expect(mockOnDayPress).toHaveBeenCalledWith(todayStr);
  });

  it('過去日を複数タップすると、それぞれ onDayPress が呼ばれる', () => {
    const mockOnDayPress = jest.fn();
    render(
      <MonthCalendar
        trainingDates={[]}
        selectedDate={null}
        onDayPress={mockOnDayPress}
      />,
    );

    capturedOnDayPress!({ dateString: '2025-12-01' });
    capturedOnDayPress!({ dateString: '2026-01-10' });
    capturedOnDayPress!({ dateString: '2026-02-05' });

    expect(mockOnDayPress).toHaveBeenCalledTimes(3);
    expect(mockOnDayPress).toHaveBeenNthCalledWith(1, '2025-12-01');
    expect(mockOnDayPress).toHaveBeenNthCalledWith(2, '2026-01-10');
    expect(mockOnDayPress).toHaveBeenNthCalledWith(3, '2026-02-05');
  });
});
