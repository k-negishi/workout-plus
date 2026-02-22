/**
 * CalendarScreen テスト
 *
 * - SafeArea 対応（useSafeAreaInsets）
 * - トレーニング日インジケーター（dot）の検証
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// SafeArea のモック（jest.mock はホイストされるため内部で jest.fn を定義）
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ナビゲーションのモック
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn().mockReturnValue({ navigate: jest.fn() }),
}));

// データベースのモック（テストごとに返り値を変更できるよう変数化）
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
  }),
}));

// MonthCalendar: props を検証できるようモックで testID 付き Text を出力
let capturedMonthCalendarProps: Record<string, unknown> = {};
jest.mock('../../components/MonthCalendar', () => ({
  MonthCalendar: (props: Record<string, unknown>) => {
    capturedMonthCalendarProps = props;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text: MockText } = require('react-native');
    return <MockText testID="mock-month-calendar">MonthCalendar</MockText>;
  },
}));

jest.mock('../../components/DaySummary', () => ({
  DaySummary: () => null,
}));

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarScreen } from '../CalendarScreen';

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMonthCalendarProps = {};
    // clearAllMocks で返り値がリセットされるため再設定
    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    });
    mockGetAllAsync.mockResolvedValue([]);
  });

  describe('SafeArea', () => {
    it('useSafeAreaInsets を呼び出す', () => {
      render(<CalendarScreen />);
      expect(useSafeAreaInsets).toHaveBeenCalled();
    });

    it('insets.top に基づく paddingTop が適用される', async () => {
      render(<CalendarScreen />);
      // ScrollView の paddingTop が insets.top + 16 になっていることを検証
      const scrollView = await screen.findByTestId('calendar-scroll-view');
      expect(scrollView.props.style).toEqual(expect.objectContaining({ paddingTop: 44 + 16 }));
    });
  });

  describe('トレーニング日インジケーター', () => {
    it('トレーニングのある日付データが MonthCalendar に trainingDates として渡される', async () => {
      // DB から完了済みワークアウトが返る状態を設定
      const mockWorkouts = [
        { id: 'w1', status: 'completed', completed_at: new Date('2026-02-10T10:00:00').getTime() },
        { id: 'w2', status: 'completed', completed_at: new Date('2026-02-15T14:00:00').getTime() },
      ];
      mockGetAllAsync.mockResolvedValue(mockWorkouts);

      render(<CalendarScreen />);

      // DB 取得後に MonthCalendar へ trainingDates が渡されるのを待つ
      await waitFor(() => {
        const dates = capturedMonthCalendarProps['trainingDates'] as Date[];
        expect(dates).toHaveLength(2);
      });
    });

    it('トレーニングデータが空のとき trainingDates が空配列で渡される', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      render(<CalendarScreen />);

      // waitFor 内は1アサーションにとどめ、後続の検証は外側で行う
      await waitFor(() => {
        expect(capturedMonthCalendarProps['trainingDates']).toBeDefined();
      });
      const dates = capturedMonthCalendarProps['trainingDates'] as Date[];
      expect(dates).toHaveLength(0);
    });

    it('completed_at から正しい Date オブジェクトに変換され dot 表示用データとして渡される', async () => {
      // 同じ日に複数のワークアウトがある場合もそれぞれ Date として渡される
      const mockWorkouts = [
        { id: 'w1', status: 'completed', completed_at: new Date('2026-01-20T09:00:00').getTime() },
        { id: 'w2', status: 'completed', completed_at: new Date('2026-01-20T18:00:00').getTime() },
        { id: 'w3', status: 'completed', completed_at: new Date('2026-02-05T12:00:00').getTime() },
      ];
      mockGetAllAsync.mockResolvedValue(mockWorkouts);

      render(<CalendarScreen />);

      await waitFor(() => {
        const dates = capturedMonthCalendarProps['trainingDates'] as Date[];
        expect(dates).toHaveLength(3);
        // Date オブジェクトとして正しく変換されていること
        expect(dates[0]).toBeInstanceOf(Date);
        expect(dates[1]).toBeInstanceOf(Date);
        expect(dates[2]).toBeInstanceOf(Date);
      });
    });

    it('DB クエリが completed ステータスのワークアウトのみ取得する', async () => {
      render(<CalendarScreen />);

      await waitFor(() => {
        expect(mockGetAllAsync).toHaveBeenCalledWith(
          expect.stringContaining("status = 'completed'"),
        );
      });
    });

    it('timer_status=discarded のデータを含んでもクラッシュせず trainingDates を生成できる', async () => {
      const mockWorkouts = [
        {
          id: 'w-discarded',
          status: 'completed',
          completed_at: new Date('2026-02-20T20:00:00').getTime(),
          timer_status: 'discarded',
          elapsed_seconds: 0,
        },
      ];
      mockGetAllAsync.mockResolvedValue(mockWorkouts);

      render(<CalendarScreen />);

      await waitFor(() => {
        const dates = capturedMonthCalendarProps['trainingDates'] as Date[];
        expect(dates).toHaveLength(1);
        expect(dates[0]).toBeInstanceOf(Date);
      });
    });
  });
});
