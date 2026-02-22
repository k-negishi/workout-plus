/**
 * ExercisePickerScreen テスト（Issue #116）
 * - 追加済み種目に「追加済み」バッジが表示される
 * - 追加済み種目をタップしても session.addExercise が呼ばれない
 * - 未追加種目をタップすると session.addExercise が呼ばれる
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
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { mode: 'single' } }),
}));

// addExercise はテストごとに呼び出し確認するためスパイを用意
const mockAddExercise = jest.fn();
jest.mock('../../../workout/hooks/useWorkoutSession', () => ({
  useWorkoutSession: () => ({
    addExercise: mockAddExercise,
  }),
}));

// Toast は副作用なし
jest.mock('@/shared/components/Toast', () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

// ExerciseRepository は空実装で十分
jest.mock('@/database/repositories/exercise', () => ({
  ExerciseRepository: {
    toggleFavorite: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// useExerciseSearch: テスト用の種目2件を返す
jest.mock('../../hooks/useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    query: '',
    setQuery: jest.fn(),
    selectedCategory: null,
    setSelectedCategory: jest.fn(),
    // sections: ベンチプレス（追加済み）とスクワット（未追加）
    sections: [
      {
        title: 'テスト種目',
        data: [
          {
            id: 'exercise-bench',
            name: 'ベンチプレス',
            muscleGroup: 'chest',
            equipment: 'barbell',
            isCustom: false,
            isFavorite: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'exercise-squat',
            name: 'スクワット',
            muscleGroup: 'legs',
            equipment: 'barbell',
            isCustom: false,
            isFavorite: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
      },
    ],
  }),
  MUSCLE_GROUP_LABELS: {
    chest: '胸',
    legs: '脚',
    back: '背中',
    shoulders: '肩',
    biceps: '二頭',
    triceps: '三頭',
    abs: '腹',
  },
}));

// currentExercises に「ベンチプレス」（exercise-bench）を含む状態をモック
jest.mock('@/stores/workoutSessionStore', () => ({
  useWorkoutSessionStore: (selector: (s: unknown) => unknown) => {
    const state = {
      currentExercises: [
        {
          id: 'we-1',
          workoutId: 'workout-1',
          exerciseId: 'exercise-bench', // ベンチプレスは追加済み
          displayOrder: 0,
          memo: null,
          createdAt: 1000,
        },
      ],
    };
    return selector(state);
  },
}));

import { ExercisePickerScreen } from '../ExercisePickerScreen';

describe('ExercisePickerScreen - 追加済み種目の表示と操作（Issue #116）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('追加済み種目（ベンチプレス）に「追加済み」テキストが表示される', () => {
    render(<ExercisePickerScreen />);

    // 「追加済み」バッジが存在する
    expect(screen.getByText('追加済み')).toBeTruthy();
  });

  it('未追加種目（スクワット）には「追加済み」テキストが表示されない', () => {
    render(<ExercisePickerScreen />);

    // 「追加済み」バッジは1件だけ（ベンチプレスのみ）
    expect(screen.queryAllByText('追加済み')).toHaveLength(1);
  });

  it('追加済み種目（ベンチプレス）をタップしても addExercise が呼ばれない', () => {
    render(<ExercisePickerScreen />);

    fireEvent.press(screen.getByText('ベンチプレス'));

    expect(mockAddExercise).not.toHaveBeenCalled();
  });

  it('未追加種目（スクワット）をタップすると addExercise が呼ばれる', async () => {
    render(<ExercisePickerScreen />);

    fireEvent.press(screen.getByText('スクワット'));

    expect(mockAddExercise).toHaveBeenCalledWith('exercise-squat');
  });
});
