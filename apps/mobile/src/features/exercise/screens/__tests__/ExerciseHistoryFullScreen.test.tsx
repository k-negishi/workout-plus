/**
 * ExerciseHistoryFullScreen テスト
 * T001: 複数スタック（HomeStack/CalendarStack/RecordStack）での共通利用を検証
 * - 画面レンダリング
 * - 戻るボタン動作
 * - exerciseName の表示
 * - ローディング状態の表示
 */
import { fireEvent, render } from '@testing-library/react-native';
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
jest.mock('../../hooks/useExerciseHistory', () => ({
  // 実際の値は mockLoading 変数を参照（テスト間で制御可能）
  useExerciseHistory: () => ({
    stats: {
      maxWeight: 100,
      maxVolume: 3000,
      averageWeight: 80,
      totalSessions: 10,
      totalVolume: 30000,
      lastPRDate: 1700000000000,
      totalSets: 50,        // 追加 (#113)
      maxEstimated1RM: 116, // 追加 (#114)
    },
    weeklyData: [],
    prHistory: [],
    allHistory: [],
    get loading() { return mockLoading; },
  }),
}));

import { ExerciseHistoryFullScreen } from '../ExerciseHistoryFullScreen';

describe('ExerciseHistoryFullScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    // 各テスト前にローディング状態をリセット
    mockLoading = false;
  });

  it('exerciseName がヘッダーに表示される', () => {
    const { getByText } = render(<ExerciseHistoryFullScreen />);
    expect(getByText('ベンチプレス')).toBeTruthy();
  });

  it('統計カード（最大重量）が表示される', () => {
    const { getByText } = render(<ExerciseHistoryFullScreen />);
    expect(getByText('最大重量')).toBeTruthy();
  });

  it('戻るボタンを押すと goBack() が呼ばれる', () => {
    const { getByText } = render(<ExerciseHistoryFullScreen />);
    // 「戻る」テキストを持つ Pressable をタップ
    fireEvent.press(getByText('戻る'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('loading=true のとき 統計カードが表示されない（ActivityIndicator のみ）', () => {
    mockLoading = true;
    const { queryByText } = render(<ExerciseHistoryFullScreen />);
    // ローディング中は統計カードが表示されないことを検証
    expect(queryByText('最大重量')).toBeNull();
  });
});
