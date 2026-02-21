/**
 * HomeScreen テスト
 *
 * - useSafeAreaInsets によるデバイスのノッチ・ダイナミックアイランド対応を検証
 * - ワークアウト 0 件でも StreakCard が表示されることを検証（EmptyState 廃止）
 * - 💪 絵文字テキストが表示されないことを検証
 *
 * DB アクセスやナビゲーションはモックで置き換え、レンダリングのみ確認する。
 */
import { render, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import { HomeScreen } from '../HomeScreen';

// SafeArea モック
// displayName を設定して react-native-css-interop のハイジャックエラーを回避
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  const mockProvider = ({ children }: { children: unknown }) =>
    RN.createElement(RN.Fragment, null, children);
  mockProvider.displayName = 'SafeAreaProvider';

  return {
    useSafeAreaInsets: jest.fn().mockReturnValue({
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    }),
    SafeAreaProvider: mockProvider,
    SafeAreaView: mockProvider,
  };
});

// ナビゲーションモック
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockGetFirstAsync = jest.fn().mockResolvedValue(null);
// DB モック
jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
  }),
}));

// SVG モック（StreakCard + QuickStatsWidget 内で使用）
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  const mockSvg = (name: string) => {
    const C = (props: Record<string, unknown>) => RN.createElement(name, props, props['children']);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: mockSvg('Svg'),
    Svg: mockSvg('Svg'),
    Path: mockSvg('Path'),
    Polyline: mockSvg('Polyline'),
    Circle: mockSvg('Circle'),
    Line: mockSvg('Line'),
  };
});

// date-fns/locale モック
jest.mock('date-fns/locale', () => ({
  ...jest.requireActual('date-fns/locale'),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllAsync.mockResolvedValue([]);
  mockGetFirstAsync.mockResolvedValue(null);
});

describe('HomeScreen SafeArea', () => {
  it('useSafeAreaInsets を呼び出して動的パディングを適用する', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSafeAreaInsets } = require('react-native-safe-area-context');
    render(<HomeScreen />);
    expect(useSafeAreaInsets).toHaveBeenCalled();
  });
});

describe('HomeScreen EmptyState 廃止', () => {
  it('StreakCard が ScrollView 内に配置される', async () => {
    const { queryByText, UNSAFE_getByType } = render(<HomeScreen />);

    await waitFor(() => {
      expect(queryByText('今月のトレーニング')).not.toBeNull();
    });

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(within(scrollView).queryByText('今月のトレーニング')).not.toBeNull();
  });

  it('ワークアウト 0 件でも StreakCard が render される', async () => {
    const { queryByText } = render(<HomeScreen />);

    // 非同期の fetchData が完了するのを待つ
    await waitFor(() => {
      // StreakCard 内の「今月のトレーニング」テキストが存在することを確認
      expect(queryByText('今月のトレーニング')).not.toBeNull();
    });
  });

  it('ワークアウト 0 件のとき 💪 絵文字テキストが render されない', async () => {
    const { queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      // loading が完了するまで待つ（StreakCard が出現 = loading 完了）
      expect(queryByText('今月のトレーニング')).not.toBeNull();
    });

    // 💪 絵文字テキストが存在しないことを確認
    expect(queryByText('💪')).toBeNull();
  });

  it('ヘッダーに挨拶テキストを表示しない', async () => {
    const { queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(queryByText('今月のトレーニング')).not.toBeNull();
    });

    expect(queryByText(/おはよう|こんにちは|こんばんは/)).toBeNull();
    expect(queryByText(/トレーニー/)).toBeNull();
  });

  it('timer_status=discarded のワークアウトでもクラッシュせず「―」を表示できる', async () => {
    mockGetAllAsync.mockImplementation((query: string) => {
      if (query.includes("FROM workouts WHERE status = 'completed'")) {
        return Promise.resolve([
          {
            id: 'w1',
            status: 'completed',
            created_at: 1700000000000,
            started_at: 1700000000000,
            completed_at: 1700003600000,
            timer_status: 'discarded',
            elapsed_seconds: 0,
            timer_started_at: null,
            memo: null,
          },
        ]);
      }
      if (query.includes('FROM workout_exercises')) {
        return Promise.resolve([
          {
            id: 'we1',
            workout_id: 'w1',
            exercise_id: 'e1',
            display_order: 0,
            memo: null,
            created_at: 1700000000000,
          },
        ]);
      }
      if (query.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's1',
            workout_exercise_id: 'we1',
            set_number: 1,
            weight: 60,
            reps: 8,
            estimated_1rm: 75,
            created_at: 1700000000000,
            updated_at: 1700000000000,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    mockGetFirstAsync.mockResolvedValue({
      id: 'e1',
      name: 'ベンチプレス',
      muscle_group: 'chest',
      equipment: 'barbell',
      is_custom: 0,
      is_favorite: 0,
      created_at: 1700000000000,
      updated_at: 1700000000000,
    });

    const { queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(queryByText('最近のトレーニング')).not.toBeNull();
    });

    expect(queryByText('―')).not.toBeNull();
  });
});
