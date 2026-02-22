/**
 * WorkoutDetailScreen テスト
 * - SafeArea 対応（T015）
 * - タップ可能検証（agent-9 で追加予定）
 * - navigation.push 検証（agent-10 で追加予定）
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// --- モック定義 ---

// jest.mock はホイストされるため、factory 内部で jest.fn を定義する
jest.mock('react-native-safe-area-context', () => {
  const mockUseSafeAreaInsets = jest.fn().mockReturnValue({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  });
  return {
    __esModule: true,
    useSafeAreaInsets: mockUseSafeAreaInsets,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// テスト内で参照するために require で取得
const { useSafeAreaInsets: mockUseSafeAreaInsets } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-safe-area-context') as { useSafeAreaInsets: jest.Mock };

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { workoutId: 'w-test-1' },
  }),
}));

const mockFindById = jest.fn().mockResolvedValue({
  id: 'w-test-1',
  status: 'completed',
  created_at: 1700000000000,
  started_at: 1700000000000,
  completed_at: 1700003600000,
  timer_status: 'stopped',
  elapsed_seconds: 3600,
  timer_started_at: null,
  memo: null,
});

const mockDelete = jest.fn().mockResolvedValue(undefined);

jest.mock('@/database/repositories/workout', () => ({
  WorkoutRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockGetAllAsync = jest.fn().mockImplementation((query: string) => {
  // workout_exercises クエリ
  if (query.includes('workout_exercises')) {
    return Promise.resolve([
      {
        id: 'we1',
        workout_id: 'w-test-1',
        exercise_id: 'ex1',
        display_order: 0,
        memo: null,
        created_at: 1700000000000,
      },
    ]);
  }
  // sets クエリ
  if (query.includes('sets')) {
    return Promise.resolve([
      {
        id: 's1',
        workout_exercise_id: 'we1',
        set_number: 1,
        weight: 80,
        reps: 10,
        estimated_1rm: 107,
        created_at: 1700000000000,
        updated_at: 1700000000000,
      },
    ]);
  }
  return Promise.resolve([]);
});

const mockGetFirstAsync = jest.fn().mockImplementation((query: string) => {
  // exercises クエリ
  if (query.includes('exercises')) {
    return Promise.resolve({
      id: 'ex1',
      name: 'ベンチプレス',
      muscle_group: 'chest',
      equipment: 'barbell',
      is_custom: 0,
      is_favorite: 0,
      created_at: 1700000000000,
      updated_at: 1700000000000,
    });
  }
  return Promise.resolve(null);
});

jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    runAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/shared/components/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

jest.mock('@/shared/components/Toast', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

import { WorkoutDetailScreen } from '../WorkoutDetailScreen';

describe('WorkoutDetailScreen', () => {
  beforeEach(() => {
    // 呼び出し履歴のみリセット（実装は保持する）
    mockUseSafeAreaInsets.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockFindById.mockClear();
    mockDelete.mockClear();
    mockGetAllAsync.mockClear();
    mockGetFirstAsync.mockClear();

    // モック返り値の再設定
    mockUseSafeAreaInsets.mockReturnValue({
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    });
    mockFindById.mockResolvedValue({
      id: 'w-test-1',
      status: 'completed',
      created_at: 1700000000000,
      started_at: 1700000000000,
      completed_at: 1700003600000,
      timer_status: 'stopped',
      elapsed_seconds: 3600,
      timer_started_at: null,
      memo: null,
    });
    mockGetAllAsync.mockImplementation((query: string) => {
      if (query.includes('workout_exercises')) {
        return Promise.resolve([
          {
            id: 'we1',
            workout_id: 'w-test-1',
            exercise_id: 'ex1',
            display_order: 0,
            memo: null,
            created_at: 1700000000000,
          },
        ]);
      }
      if (query.includes('sets')) {
        return Promise.resolve([
          {
            id: 's1',
            workout_exercise_id: 'we1',
            set_number: 1,
            weight: 80,
            reps: 10,
            estimated_1rm: 107,
            created_at: 1700000000000,
            updated_at: 1700000000000,
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockGetFirstAsync.mockImplementation((query: string) => {
      if (query.includes('exercises')) {
        return Promise.resolve({
          id: 'ex1',
          name: 'ベンチプレス',
          muscle_group: 'chest',
          equipment: 'barbell',
          is_custom: 0,
          is_favorite: 0,
          created_at: 1700000000000,
          updated_at: 1700000000000,
        });
      }
      return Promise.resolve(null);
    });
  });

  // --- SafeArea（T015） ---
  describe('SafeArea', () => {
    it('useSafeAreaInsets を呼び出す', () => {
      render(<WorkoutDetailScreen />);
      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });

    it('ヘッダーの paddingTop に insets.top + 16 が適用される', async () => {
      const { getByTestId } = render(<WorkoutDetailScreen />);
      // データ読み込み完了を待つ
      const header = await waitFor(() => getByTestId('workout-detail-header'));
      // style prop に paddingTop が設定されている
      expect(header.props.style).toEqual(
        expect.objectContaining({ paddingTop: 44 + 16 }),
      );
    });
  });

  // --- タップ可能検証（T027） ---
  describe('種目名タップ', () => {
    it('種目名がタップ可能（testID="exerciseName-{exerciseId}"）である', async () => {
      const { findByTestId } = render(<WorkoutDetailScreen />);

      // testID="exerciseName-ex1" を持つ Pressable が存在することを検証
      const exerciseName = await findByTestId('exerciseName-ex1');
      expect(exerciseName).toBeTruthy();
    });
  });

  // --- ExerciseHistory ナビゲーション検証（T035） ---
  describe('ExerciseHistory ナビゲーション', () => {
    it('種目名タップで navigation.navigate("ExerciseHistory") が呼ばれる', async () => {
      const { findByTestId } = render(<WorkoutDetailScreen />);

      // 種目名の表示を待つ
      const exerciseName = await findByTestId('exerciseName-ex1');

      // 種目名をタップ
      fireEvent.press(exerciseName);

      // ExerciseHistory へのナビゲーションが呼ばれることを検証
      expect(mockNavigate).toHaveBeenCalledWith('ExerciseHistory', {
        exerciseId: 'ex1',
        exerciseName: 'ベンチプレス',
      });
    });
  });
});
