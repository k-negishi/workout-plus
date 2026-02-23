/**
 * ExerciseHistoryFullScreen テスト
 * T001: 複数スタック（HomeStack/CalendarStack/RecordStack）での共通利用を検証
 * - 画面レンダリング
 * - 戻るボタン動作
 * - exerciseName の表示
 * - ローディング状態の表示
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// --- モック定義 ---

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  // route.params に exerciseId/exerciseName を設定
  useRoute: () => ({
    params: { exerciseId: 'ex-1', exerciseName: 'ベンチプレス' },
  }),
}));

// gifted-charts は ESM のみ配布のため jest 環境でパースエラーになる
jest.mock('react-native-gifted-charts', () => ({
  BarChart: 'BarChart',
}));

// react-native-svg のモック
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  Polyline: 'Polyline',
}));

// date-fns のモック（タイムゾーン依存を排除）
jest.mock('date-fns', () => ({
  format: (_date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') return '2026-02-22';
    if (formatStr === 'M/d') return '2/22';
    return '2026-02-22';
  },
}));
jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// loading 状態をテストごとに切り替えられるよう変数で管理する
// jest.mock のファクトリはホイストされるため、変数は let で宣言し参照渡しする
let mockLoading = false;
// allHistory をテストごとに差し替え可能にする
let mockAllHistory: Array<{
  workoutId: string;
  completedAt: number;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number | null;
    estimated1RM: number | null;
  }>;
  hasPR: boolean;
}> = [];
jest.mock('../../hooks/useExerciseHistory', () => ({
  // 実際の値は mockLoading / mockAllHistory 変数を参照（テスト間で制御可能）
  useExerciseHistory: () => ({
    stats: {
      maxWeight: 100,
      maxVolume: 3000,
      averageWeight: 80,
      totalSessions: 10,
      totalVolume: 30000,
      lastPRDate: 1700000000000,
      totalSets: 50,
      maxEstimated1RM: 116,
    },
    weeklyData: [],
    prHistory: [],
    get allHistory() {
      return mockAllHistory;
    },
    get loading() {
      return mockLoading;
    },
  }),
}));

import { ExerciseHistoryFullScreen } from '../ExerciseHistoryFullScreen';

describe('ExerciseHistoryFullScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    // 各テスト前にローディング状態と履歴をリセット
    mockLoading = false;
    mockAllHistory = [];
  });

  it('exerciseName がヘッダーに表示される', () => {
    render(<ExerciseHistoryFullScreen />);
    expect(screen.getByText('ベンチプレス')).toBeTruthy();
  });

  it('統計カード（最大重量）が表示される', () => {
    render(<ExerciseHistoryFullScreen />);
    expect(screen.getByText('最大重量')).toBeTruthy();
  });

  it('戻るボタンを押すと goBack() が呼ばれる', () => {
    render(<ExerciseHistoryFullScreen />);
    // 「戻る」テキストを持つ Pressable をタップ
    fireEvent.press(screen.getByText('戻る'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('loading=true のとき 統計カードが表示されない（ActivityIndicator のみ）', () => {
    mockLoading = true;
    render(<ExerciseHistoryFullScreen />);
    // ローディング中は統計カードが表示されないことを検証
    expect(screen.queryByText('最大重量')).toBeNull();
  });

  describe('日付表示', () => {
    it('日付が「M月D日(曜日)」形式で表示される', () => {
      // 2026-02-18 は水曜日
      mockAllHistory = [
        {
          workoutId: 'w1',
          // 2026-02-18T10:00:00.000Z のタイムスタンプ
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('2月18日(水)')).toBeTruthy();
    });
  });

  describe('セット表示デザイン（DaySummary パターン統一）', () => {
    it('セット番号が表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [
            { setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 },
            { setNumber: 2, weight: 85, reps: 8, estimated1RM: 108 },
          ],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      // DaySummary パターンではセット番号が単独テキストで表示される
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('重量と回数が「Nkg x N」形式で表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      // DaySummary パターンでは「80kg × 10」が1つのテキストノード
      expect(screen.getByText('80kg × 10')).toBeTruthy();
    });

    it('1RM換算値が表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('1RM: 107kg')).toBeTruthy();
    });

    it('1RM が null のセットでは 1RM 表示が省略される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: null, reps: 10, estimated1RM: null }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.queryByText(/1RM:/)).toBeNull();
    });
  });
});
