/**
 * CalendarScreen テスト
 *
 * - SafeArea 対応（useSafeAreaInsets）
 * - トレーニング日インジケーター（dot）の検証
 * - targetDate パラメータ対応（T6）
 * - Issue #152: 日付変更時に currentWorkoutId がリセットされること
 * - Issue #153: 削除機能（ConfirmDialog 表示・WorkoutRepository.delete 呼び出し・refreshKey 更新）
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

// useRoute のモック返却値（テストごとに差し替える）
const mockRouteParams: { targetDate?: string } | undefined = {};

// ナビゲーションのモック（useRoute・useFocusEffect を含む）
// useFocusEffect: React の useEffect に委譲してテスト環境でフォーカス時の挙動を再現する
// deps に [cb] を指定し、コールバック参照が変わらない限り再実行されないようにして無限ループを防ぐ
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    useNavigation: jest.fn().mockReturnValue({ navigate: jest.fn() }),
    useRoute: jest.fn(() => ({ params: mockRouteParams })),
    useFocusEffect: (cb: () => void) => {
      mockUseFocusEffect(cb);

      useEffect(cb, [cb]);
    },
  };
});

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

// DaySummary: onWorkoutFound を親に渡せるよう props を外部変数に保存するモック
// factory 内で外部変数への参照は mock プレフィックスが必要なため変数名を合わせる
let mockDaySummaryCapturedProps: Record<string, unknown> = {};
jest.mock('../../components/DaySummary', () => ({
  DaySummary: (mockProps: Record<string, unknown>) => {
    // 最新の props を外部変数に保存し、テストから onWorkoutFound を直接呼べるようにする
    mockDaySummaryCapturedProps = mockProps;
    return null;
  },
}));

// WorkoutRepository のモック: delete と findCompletedByDate を差し替え可能にする
const mockWorkoutRepositoryDelete = jest.fn().mockResolvedValue(undefined);
const mockWorkoutRepositoryFindCompletedByDate = jest.fn().mockResolvedValue(null);
jest.mock('@/database/repositories/workout', () => ({
  WorkoutRepository: {
    delete: (...args: unknown[]) => mockWorkoutRepositoryDelete(...args),
    findCompletedByDate: (...args: unknown[]) => mockWorkoutRepositoryFindCompletedByDate(...args),
  },
}));

// Alert.alert のスパイ: 削除確認ダイアログは Alert.alert（ネイティブ）で実装している
// jest.spyOn で呼び出しを検証し、ボタン onPress を手動実行して削除フローをシミュレートする
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarScreen } from '../CalendarScreen';

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMonthCalendarProps = {};
    mockDaySummaryCapturedProps = {};
    // clearAllMocks で返り値がリセットされるため再設定
    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    });
    mockGetAllAsync.mockResolvedValue([]);
    mockWorkoutRepositoryDelete.mockResolvedValue(undefined);
    mockWorkoutRepositoryFindCompletedByDate.mockResolvedValue(null);
    // Alert.alert をスパイ化してネイティブ UI をテスト可能にする
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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

  describe('targetDate パラメータ対応', () => {
    it('targetDate パラメータが渡された場合、MonthCalendar の selectedDate がその値に更新される', async () => {
      // targetDate を持つルートパラメータを設定
      (useRoute as jest.Mock).mockReturnValue({ params: { targetDate: '2026-01-15' } });

      render(<CalendarScreen />);

      // selectedDate が targetDate の値（'2026-01-15'）に更新されることを確認
      await waitFor(() => {
        const selected = capturedMonthCalendarProps['selectedDate'] as string;
        expect(selected).toBe('2026-01-15');
      });
    });

    it('targetDate パラメータがない場合、selectedDate が今日の日付のままである', async () => {
      // targetDate なしのルートパラメータを設定
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });

      render(<CalendarScreen />);

      // selectedDate は今日の日付（'yyyy-MM-dd' 形式）のまま
      await waitFor(() => {
        const selected = capturedMonthCalendarProps['selectedDate'] as string;
        // 今日の日付パターンを検証（YYYY-MM-DD 形式であること）
        expect(selected).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // '2026-01-15' ではないこと（targetDate が無視されていること）
        expect(selected).not.toBe('2026-01-15');
      });
    });
  });

  describe('Issue #152: 日付変更時の currentWorkoutId リセット', () => {
    it('日付タップ時に currentWorkoutId が null にリセットされ、削除ボタンが非表示になる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      // DaySummary の onWorkoutFound 経由でワークアウトIDをセットする
      // capturedProps は render 後に設定されるため waitFor で待つ
      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['onWorkoutFound']).toBeDefined();
      });

      // act() でラップして React の state 更新を正しく処理させる
      await act(async () => {
        const onWorkoutFound = mockDaySummaryCapturedProps['onWorkoutFound'] as (
          workoutId: string | null,
        ) => void;
        onWorkoutFound('workout-id-1');
      });

      // 削除ボタンが表示されていることを確認する
      await waitFor(() => {
        expect(screen.getByTestId('delete-workout-button')).toBeTruthy();
      });

      // MonthCalendar の onDayPress を act() でラップして呼び出す
      // act() なしだと React の state 更新（setSelectedDate/setCurrentWorkoutId）が保留になる
      await act(async () => {
        const onDayPress = capturedMonthCalendarProps['onDayPress'] as (date: string) => void;
        onDayPress('2026-02-01');
      });

      // 日付変更後は currentWorkoutId がリセットされ、削除ボタンが非表示になること
      await waitFor(() => {
        expect(screen.queryByTestId('delete-workout-button')).toBeNull();
      });
    });

    it('DaySummary に渡される dateString が日付変更後に更新されること', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      // 初期状態の DaySummary の dateString を取得する
      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['dateString']).toBeDefined();
      });
      const initialDateString = mockDaySummaryCapturedProps['dateString'] as string;

      // 日付を変更する
      const onDayPress = capturedMonthCalendarProps['onDayPress'] as (date: string) => void;
      onDayPress('2026-03-01');

      // 変更後の dateString が更新されること
      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['dateString']).toBe('2026-03-01');
      });

      // 変更前と異なる日付になっていることを確認（key の変化で再マウントが発生する前提）
      expect(mockDaySummaryCapturedProps['dateString']).not.toBe(initialDateString);
    });
  });

  describe('Issue #153: ワークアウト削除機能', () => {
    /**
     * DaySummary の onWorkoutFound を呼び出してワークアウト ID を親にセットするヘルパー
     * DaySummary モックが捕捉した props 経由で親コンポーネントのコールバックを実行する
     */
    async function simulateWorkoutFound(workoutId: string) {
      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['onWorkoutFound']).toBeDefined();
      });
      const onWorkoutFound = mockDaySummaryCapturedProps['onWorkoutFound'] as (
        wid: string | null,
      ) => void;
      onWorkoutFound(workoutId);
      await waitFor(() => {
        expect(screen.getByTestId('delete-workout-button')).toBeTruthy();
      });
    }

    it('削除ボタンをタップすると Alert.alert が呼ばれる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      await simulateWorkoutFound('workout-id-abc');

      fireEvent.press(screen.getByTestId('delete-workout-button'));

      // Alert.alert が「ワークアウトを削除」タイトルで呼ばれること
      expect(Alert.alert).toHaveBeenCalledWith(
        'ワークアウトを削除',
        'このワークアウトを削除してよろしいですか？',
        expect.any(Array),
      );
    });

    it('確認 Alert で削除を確定すると WorkoutRepository.delete が呼ばれる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      await simulateWorkoutFound('workout-id-delete-test');

      fireEvent.press(screen.getByTestId('delete-workout-button'));

      // Alert.alert の第3引数からボタン配列を取得し、destructive ボタンの onPress を呼ぶ
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
        text: string;
        style: string;
        onPress?: () => Promise<void>;
      }>;
      const deleteButton = buttons.find((b) => b.style === 'destructive');
      await act(async () => {
        await deleteButton?.onPress?.();
      });

      expect(mockWorkoutRepositoryDelete).toHaveBeenCalledWith('workout-id-delete-test');
    });

    it('削除後に fetchTrainingDates が再呼び出しされる（refreshKey インクリメントで DaySummary も再取得される）', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      await simulateWorkoutFound('workout-id-refresh-test');

      fireEvent.press(screen.getByTestId('delete-workout-button'));

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
        text: string;
        style: string;
        onPress?: () => Promise<void>;
      }>;
      const deleteButton = buttons.find((b) => b.style === 'destructive');
      await act(async () => {
        await deleteButton?.onPress?.();
      });

      await waitFor(() => {
        expect(mockWorkoutRepositoryDelete).toHaveBeenCalledTimes(1);
      });

      // 削除後に fetchTrainingDates が再呼び出しされること
      // 初回レンダー時に1回 + 削除後に1回 = 合計2回以上呼ばれること
      await waitFor(() => {
        expect(mockGetAllAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('キャンセルを選択すると WorkoutRepository.delete は呼ばれない', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      await simulateWorkoutFound('workout-id-cancel-test');

      fireEvent.press(screen.getByTestId('delete-workout-button'));

      // Alert が呼ばれること
      expect(Alert.alert).toHaveBeenCalled();
      // delete は呼ばれないこと（キャンセルボタンの onPress は呼んでいない）
      expect(mockWorkoutRepositoryDelete).not.toHaveBeenCalled();
    });
  });

  describe('Issue #167: 月変更時の自動日付選択', () => {
    it('月変更コールバックが呼ばれると selectedDate がその月の1日に更新される', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      // MonthCalendar が描画されるまで待機
      await waitFor(() => {
        expect(capturedMonthCalendarProps['onMonthChange']).toBeDefined();
      });

      // MonthCalendar の onMonthChange コールバックを手動で呼ぶ（2026-02-01 = 2月の1日）
      await act(async () => {
        const onMonthChange = capturedMonthCalendarProps['onMonthChange'] as (
          dateString: string,
        ) => void;
        onMonthChange('2026-02-01');
      });

      // selectedDate が月の1日（2026-02-01）に更新されること
      await waitFor(() => {
        const selected = capturedMonthCalendarProps['selectedDate'] as string;
        expect(selected).toBe('2026-02-01');
      });
    });

    it('月変更時に daySummaryLoaded がリセットされ DaySummary が再ロードされる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['onWorkoutFound']).toBeDefined();
      });

      // DaySummary の onWorkoutFound で workoutId をセット
      await act(async () => {
        const onWorkoutFound = mockDaySummaryCapturedProps['onWorkoutFound'] as (
          workoutId: string | null,
        ) => void;
        onWorkoutFound('workout-id-1');
      });

      // 削除ボタンが表示されること（daySummaryLoaded = true の確認）
      await waitFor(() => {
        expect(screen.getByTestId('delete-workout-button')).toBeTruthy();
      });

      // 月変更コールバックを呼ぶ
      await act(async () => {
        const onMonthChange = capturedMonthCalendarProps['onMonthChange'] as (
          dateString: string,
        ) => void;
        onMonthChange('2026-01-01');
      });

      // 月変更後は currentWorkoutId がリセットされ削除ボタンが非表示になること
      await waitFor(() => {
        expect(screen.queryByTestId('delete-workout-button')).toBeNull();
      });
    });
  });

  describe('Issue #172: フォーカス時のデータ再取得', () => {
    it('useFocusEffect が呼ばれている（useEffect でなく useFocusEffect を使用していること）', () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      render(<CalendarScreen />);

      // useFocusEffect がコールバック付きで呼ばれていること
      expect(useFocusEffect).toHaveBeenCalled();
    });

    it('フォーカス時に fetchTrainingDates が再呼び出しされる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      mockGetAllAsync.mockResolvedValue([]);

      render(<CalendarScreen />);

      // 初回レンダーで fetchTrainingDates が呼ばれる（DB クエリが実行される）
      await waitFor(() => {
        expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('フォーカス時に DaySummary の refreshKey がインクリメントされる', async () => {
      (useRoute as jest.Mock).mockReturnValue({ params: undefined });
      mockGetAllAsync.mockResolvedValue([]);

      render(<CalendarScreen />);

      // DaySummary に refreshKey が渡されていることを確認
      await waitFor(() => {
        expect(mockDaySummaryCapturedProps['refreshKey']).toBeDefined();
      });
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
