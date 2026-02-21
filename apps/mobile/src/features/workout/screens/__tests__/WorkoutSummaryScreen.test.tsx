/**
 * WorkoutSummaryScreen テスト
 * - PR セクションの条件付きレンダリング（T030）
 */
import { render, waitFor } from '@testing-library/react-native';
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

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
  useRoute: () => ({
    params: { workoutId: 'w-test-1' },
  }),
}));

const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
  }),
}));

const mockFindByExerciseId = jest.fn();
jest.mock('@/database/repositories/pr', () => ({
  PersonalRecordRepository: {
    findByExerciseId: (...args: unknown[]) => mockFindByExerciseId(...args),
  },
}));

jest.mock('../../utils/calculate1RM', () => ({
  calculateVolume: jest.fn().mockReturnValue(800),
}));

import { WorkoutSummaryScreen } from '../WorkoutSummaryScreen';

/** DB モックのデフォルト値を設定する */
function setupDefaultMocks(options?: { withPRs?: boolean; timerStatus?: string }) {
  // ワークアウト情報
  mockGetFirstAsync.mockImplementation((query: string) => {
    if (query.includes('workouts')) {
      return Promise.resolve({
        created_at: 1700000000000,
        completed_at: 1700003600000,
        elapsed_seconds: 1800,
        timer_status: options?.timerStatus ?? 'running',
      });
    }
    return Promise.resolve(null);
  });

  // 種目一覧
  mockGetAllAsync.mockImplementation((query: string) => {
    if (query.includes('workout_exercises')) {
      return Promise.resolve([{ we_id: 'we1', exercise_id: 'ex1', name: 'ベンチプレス' }]);
    }
    // セット情報
    if (query.includes('sets')) {
      return Promise.resolve([{ weight: 80, reps: 10 }]);
    }
    return Promise.resolve([]);
  });

  // PR 情報
  if (options?.withPRs) {
    mockFindByExerciseId.mockResolvedValue([
      {
        id: 'pr1',
        exerciseId: 'ex1',
        prType: 'max_weight',
        value: 100,
        workoutId: 'w-test-1',
        achievedAt: 1700003600000,
      },
    ]);
  } else {
    mockFindByExerciseId.mockResolvedValue([]);
  }
}

describe('WorkoutSummaryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PR セクション', () => {
    it('personalRecords が空のとき「新記録達成」セクションが非表示', async () => {
      setupDefaultMocks({ withPRs: false });

      const { queryByText } = render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ（「ワークアウト完了」が表示される）
      await waitFor(() => {
        expect(queryByText('ワークアウト完了')).toBeTruthy();
      });

      // 「新記録達成」テキストが存在しないことを検証
      expect(queryByText('新記録達成')).toBeNull();
    });

    it('personalRecords があるとき「新記録達成」セクションが表示される', async () => {
      setupDefaultMocks({ withPRs: true });

      const { getByText, getAllByText, queryByText } = render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ
      await waitFor(() => {
        expect(queryByText('ワークアウト完了')).toBeTruthy();
      });

      // 「新記録達成」テキストが存在することを検証
      await waitFor(() => {
        expect(getByText('新記録達成')).toBeTruthy();
      });

      // PR の種目名とラベルが表示されることも検証
      // 「ベンチプレス」は PR セクションと種目別サマリーの両方に表示されるため getAllByText を使用
      expect(getAllByText('ベンチプレス').length).toBeGreaterThanOrEqual(2);
      expect(getByText('最大重量: 100kg')).toBeTruthy();
    });
  });

  describe('所要時間表示', () => {
    it('timer_status が discarded のとき「―」を表示する', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'discarded' });

      const { queryByText } = render(<WorkoutSummaryScreen />);

      await waitFor(() => {
        expect(queryByText('ワークアウト完了')).toBeTruthy();
      });

      expect(queryByText('―')).toBeTruthy();
      expect(queryByText('30分')).toBeNull();
    });

    it('timer_status が discarded 以外のとき通常の時間表示をする', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'running' });

      const { queryByText } = render(<WorkoutSummaryScreen />);

      await waitFor(() => {
        expect(queryByText('ワークアウト完了')).toBeTruthy();
      });

      expect(queryByText('30分')).toBeTruthy();
    });
  });
});
