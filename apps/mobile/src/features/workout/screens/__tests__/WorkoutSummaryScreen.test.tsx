/**
 * WorkoutSummaryScreen テスト
 * - PR セクションの条件付きレンダリング（T030）
 * - Issue #142: ヘッダースタイルの統一検証
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

const mockPopToTop = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    // T08: RecordStack 廃止後は popToTop() でルートまで戻る
    popToTop: mockPopToTop,
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

  describe('Issue #142: ヘッダースタイル統一', () => {
    it('白ヘッダーが testID "summary-header" で存在する', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      // 白ヘッダーが存在することを検証（testID で特定）
      expect(screen.getByTestId('summary-header')).toBeTruthy();
    });

    it('戻るボタン（accessibilityLabel="戻る"）が存在する', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      expect(screen.getByLabelText('戻る')).toBeTruthy();
    });

    it('戻るボタンを押すと popToTop() が呼ばれる', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      // 戻るボタン（accessibilityLabel）でタップ
      fireEvent.press(screen.getByLabelText('戻る'));

      expect(mockPopToTop).toHaveBeenCalledTimes(1);
    });

    it('ヘッダーにタイトルテキスト「ワークアウト完了」が表示される', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // testID "summary-header-title" でタイトルを特定
      await screen.findByTestId('summary-header-title');
    });
  });

  describe('PR セクション', () => {
    it('personalRecords が空のとき「新記録達成」セクションが非表示', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ（findByText は要素が現れるまで待機する）
      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      // 「新記録達成」テキストが存在しないことを検証（不在チェックには queryBy を使う）
      expect(screen.queryByText('新記録達成')).toBeNull();
    });

    it('personalRecords があるとき「新記録達成」セクションが表示される', async () => {
      setupDefaultMocks({ withPRs: true });

      render(<WorkoutSummaryScreen />);

      // データ読み込み完了を待つ
      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      // 「新記録達成」テキストが存在することを検証（presence チェックは findBy/getBy を使う）
      await screen.findByText('新記録達成');

      // PR の種目名とラベルが表示されることも検証
      // 「ベンチプレス」は PR セクションと種目別サマリーの両方に表示されるため getAllByText を使用
      expect(screen.getAllByText('ベンチプレス').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('最大重量: 100kg')).toBeTruthy();
    });
  });

  describe('ホームに戻る', () => {
    it('T08: ボタン押下で popToTop() が呼ばれる（RecordStack 廃止後はスタックルートに戻る）', async () => {
      setupDefaultMocks({ withPRs: false });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      fireEvent.press(screen.getByText('ホームに戻る'));

      // T08: RecordStack 廃止後は popToTop() でスタックのルート画面（Home/Calendar）に戻る
      expect(mockPopToTop).toHaveBeenCalledTimes(1);
    });
  });

  describe('所要時間表示', () => {
    it('timer_status が discarded のとき「―」を表示する', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'discarded' });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      // 存在確認は getBy 系、不在確認は queryBy 系
      expect(screen.getByText('―')).toBeTruthy();
      expect(screen.queryByText('30分')).toBeNull();
    });

    it('timer_status が discarded 以外のとき通常の時間表示をする', async () => {
      setupDefaultMocks({ withPRs: false, timerStatus: 'running' });

      render(<WorkoutSummaryScreen />);

      // ヘッダータイトルとコンテンツ内の両方に「ワークアウト完了」が存在するため testID で待機
      await screen.findByTestId('summary-header-title');

      expect(screen.getByText('30分')).toBeTruthy();
    });
  });
});
