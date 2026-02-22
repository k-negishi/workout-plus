/**
 * WorkoutSummaryScreen テスト
 * - PR セクションの条件付きレンダリング（T030）
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

const mockReset = jest.fn();
const mockNavigateParent = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
    // getParent() でタブ navigator の navigate を返す
    getParent: () => ({ navigate: mockNavigateParent }),
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

      render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ（findByText は要素が現れるまで待機する）
      await screen.findByText('ワークアウト完了');

      // 「新記録達成」テキストが存在しないことを検証（不在チェックには queryBy を使う）
      expect(screen.queryByText('新記録達成')).toBeNull();
    });

    it('personalRecords があるとき「新記録達成」セクションが表示される', async () => {
      setupDefaultMocks({ withPRs: true });

      render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ
      await screen.findByText('ワークアウト完了');

      // 「新記録達成」テキストが存在することを検証（presence チェックは findBy/getBy を使う）
      await screen.findByText('新記録達成');

      // PR の種目名とラベルが表示されることも検証
      // 「ベンチプレス」は PR セクションと種目別サマリーの両方に表示されるため getAllByText を使用
      expect(screen.getAllByText('ベンチプレス').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('最大重量: 100kg')).toBeTruthy();
    });
  });

  describe('ホームに戻る', () => {
    it('ボタン押下で RecordStack をリセットして HomeTab に遷移する', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      await screen.findByText('ワークアウト完了');

      fireEvent.press(screen.getByText('ホームに戻る'));

      // RecordStack を Record 画面にリセット（WorkoutSummary に戻らないように）
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Record' }] });
      // 親のタブ navigator で HomeTab に遷移
      expect(mockNavigateParent).toHaveBeenCalledWith('HomeTab');
    });
  });

  describe('所要時間表示', () => {
    it('timer_status が discarded のとき「―」を表示する', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'discarded' });

      render(<WorkoutSummaryScreen />);

      await screen.findByText('ワークアウト完了');

      // 存在確認は getBy 系、不在確認は queryBy 系
      expect(screen.getByText('―')).toBeTruthy();
      expect(screen.queryByText('30分')).toBeNull();
    });

    it('timer_status が discarded 以外のとき通常の時間表示をする', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'running' });

      render(<WorkoutSummaryScreen />);

      await screen.findByText('ワークアウト完了');

      expect(screen.getByText('30分')).toBeTruthy();
    });
  });
});
