/**
 * WorkoutEditScreen テスト
 * - SafeArea 対応（Issue #117）
 *   ヘッダーが useSafeAreaInsets の top インセットを正しく適用していることを検証
 */
import { render, waitFor } from '@testing-library/react-native';
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
    params: { workoutId: 'w-edit-test-1' },
  }),
}));

// DB: workout_exercises / exercises / sets を返すモック
const mockGetAllAsync = jest.fn().mockImplementation((query: string) => {
  if (query.includes('workout_exercises')) {
    return Promise.resolve([
      {
        id: 'we1',
        workout_id: 'w-edit-test-1',
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

const mockGetFirstAsync = jest.fn().mockImplementation((query: string) => {
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

jest.mock('@/database/repositories/set', () => ({
  SetRepository: {
    create: jest.fn().mockResolvedValue({
      id: 's2',
      workout_exercise_id: 'we1',
      set_number: 2,
      weight: null,
      reps: null,
      estimated_1rm: null,
      created_at: 1700000000001,
      updated_at: 1700000000001,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/database/repositories/pr', () => ({
  PersonalRecordRepository: {
    recalculateForExercise: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/shared/components/Toast', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

// DiscardDialog はモーダルのため簡易モック
jest.mock('../../components/DiscardDialog', () => ({
  DiscardDialog: () => null,
}));

// --- テスト対象 ---
import { WorkoutEditScreen } from '../WorkoutEditScreen';

// --- テスト ---
describe('WorkoutEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSafeAreaInsets.mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 });
  });

  describe('SafeArea 対応（Issue #117）', () => {
    it('useSafeAreaInsets を呼び出す', () => {
      render(<WorkoutEditScreen />);
      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });

    it('ヘッダーの paddingTop に insets.top が適用される', async () => {
      const { getByTestId } = render(<WorkoutEditScreen />);
      // ヘッダーが描画されるまで待つ
      const header = await waitFor(() => getByTestId('workout-edit-header'));
      // style prop に paddingTop: 44 が設定されている
      expect(header.props.style).toEqual(expect.objectContaining({ paddingTop: 44 }));
    });
  });
});
