/**
 * HomeScreen テスト
 *
 * - useSafeAreaInsets によるデバイスのノッチ・ダイナミックアイランド対応を検証
 * - ワークアウト 0 件でも StreakCard が表示されることを検証（EmptyState 廃止）
 * - 💪 絵文字テキストが表示されないことを検証
 *
 * DB アクセスやナビゲーションはモックで置き換え、レンダリングのみ確認する。
 */
import { render, screen, waitFor, within } from '@testing-library/react-native';
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
// T10: HomeScreen で useFocusEffect を使うため no-op モックを追加する
// （実際の navigation context が不要なためコールバックを実行しないことで副作用を防ぐ）
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), push: jest.fn() }),
  useFocusEffect: jest.fn(),
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

// T10: WorkoutRepository モック（記録中チェックで呼ばれる）
const mockFindRecording = jest.fn().mockResolvedValue(null);
jest.mock('@/database/repositories/workout', () => ({
  WorkoutRepository: {
    findRecording: (...args: unknown[]) => mockFindRecording(...args),
    findTodayCompleted: jest.fn().mockResolvedValue(null),
  },
}));

// @expo/vector-icons モック（Ionicons 等をシンプルなコンポーネントに差し替え）
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  const mockIcon = (name: string) => {
    const C = (props: Record<string, unknown>) =>
      RN.createElement(name, {
        testID: props['testID'],
        accessibilityLabel: props['accessibilityLabel'],
      });
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    Ionicons: mockIcon('Ionicons'),
  };
});

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

// useFocusEffect モック参照（テスト内でコールバック実行制御するため）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useFocusEffect: mockUseFocusEffect } = require('@react-navigation/native');

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllAsync.mockResolvedValue([]);
  mockGetFirstAsync.mockResolvedValue(null);
  mockFindRecording.mockResolvedValue(null);
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
    const { UNSAFE_getByType } = render(<HomeScreen />);

    // getByText は存在することを前提とするため、presence チェックに適切
    await screen.findByText('今月のトレーニング');

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(within(scrollView).getByText('今月のトレーニング')).toBeTruthy();
  });

  it('ワークアウト 0 件でも StreakCard が render される', async () => {
    render(<HomeScreen />);

    // 非同期の fetchData が完了するのを待つ（findByText は要素が存在するまで待機する）
    await screen.findByText('今月のトレーニング');
  });

  it('ワークアウト 0 件のとき 💪 絵文字テキストが render されない', async () => {
    render(<HomeScreen />);

    // loading が完了するまで待つ（StreakCard が出現 = loading 完了）
    await screen.findByText('今月のトレーニング');

    // 💪 絵文字テキストが存在しないことを確認（不在チェックには queryBy を使う）
    expect(screen.queryByText('💪')).toBeNull();
  });

  it('ヘッダーに挨拶テキストを表示しない', async () => {
    render(<HomeScreen />);

    await screen.findByText('今月のトレーニング');

    // 不在チェックには queryBy を使う
    expect(screen.queryByText(/おはよう|こんにちは|こんばんは/)).toBeNull();
    expect(screen.queryByText(/トレーニー/)).toBeNull();
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

    render(<HomeScreen />);

    // 存在確認は getBy 系（findBy は非同期 getBy）を使う
    await screen.findByText('最近のトレーニング');

    expect(screen.getByText('―')).toBeTruthy();
  });
});

describe('HomeScreen タイトルヘッダー', () => {
  it('Workout Plus タイトルが ScrollView 内に表示される', async () => {
    const { UNSAFE_getByType } = render(<HomeScreen />);

    // StreakCard 表示を待ちつつ、loading 完了を確認
    await screen.findByText('今月のトレーニング');

    // タイトルテキストが存在する（presence チェックは getBy 系）
    expect(screen.getByText('Workout Plus')).toBeTruthy();

    // タイトルが ScrollView 内に配置されている（スクロールアウトする = 固定でない）
    const scrollView = UNSAFE_getByType(ScrollView);
    expect(within(scrollView).getByText('Workout Plus')).toBeTruthy();
  });

  it('設定アイコンボタンが表示される (testID: settings-button)', async () => {
    render(<HomeScreen />);

    await screen.findByText('今月のトレーニング');

    // 設定ボタンが testID で取得できる（presence チェックは getBy 系）
    expect(screen.getByTestId('settings-button')).toBeTruthy();
  });
});

describe('HomeScreen 記録中バナーと記録ボタンの排他表示', () => {
  it('記録中セッションがないとき、記録ボタンが表示されバナーは非表示', async () => {
    // useFocusEffect のコールバックを実行して isRecording を評価させる
    mockUseFocusEffect.mockImplementation((cb: () => void) => cb());
    mockFindRecording.mockResolvedValue(null);

    render(<HomeScreen />);
    await screen.findByText('今月のトレーニング');

    expect(screen.getByTestId('record-workout-button')).toBeTruthy();
    expect(screen.queryByTestId('recording-banner')).toBeNull();
  });

  it('記録中セッションがあるとき、バナーが表示され記録ボタンは非表示', async () => {
    // useFocusEffect のコールバックを実行して isRecording = true にする
    mockUseFocusEffect.mockImplementation((cb: () => void) => cb());
    mockFindRecording.mockResolvedValue({
      id: 'recording-1',
      status: 'recording',
      created_at: Date.now(),
    });

    render(<HomeScreen />);
    await screen.findByText('今月のトレーニング');

    // 非同期の setIsRecording 反映を待つ
    await waitFor(() => {
      expect(screen.getByTestId('recording-banner')).toBeTruthy();
    });
    expect(screen.queryByTestId('record-workout-button')).toBeNull();
  });
});
