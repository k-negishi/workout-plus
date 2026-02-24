/**
 * ExercisePickerScreen テスト（Issue #116, #136）
 * - 追加済み種目に「追加済み」バッジが表示される
 * - 追加済み種目をタップしても session.addExercise が呼ばれない
 * - 未追加種目をタップすると session.addExercise が呼ばれる
 * - Issue #136: カスタム種目追加 FAB が画面右下に表示される
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// --- モック定義 ---

// @expo/vector-icons モック（Ionicons を testID 付きコンポーネントに差し替え）
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

// useExerciseSearch: テストごとに selectedCategory を変えられるよう jest.fn() で制御可能にする
const mockUseExerciseSearch = jest.fn();

jest.mock('../../hooks/useExerciseSearch', () => ({
  // クロージャでラップすることで factory ホイスティング後に mockUseExerciseSearch が
  // 評価されるようにする（直接代入すると factory 実行時に undefined になる）
  useExerciseSearch: (...args: unknown[]) => mockUseExerciseSearch(...args),
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

/** テスト用の種目一覧 */
const TEST_SECTIONS = [
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
        sortOrder: 1,
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
        sortOrder: 2,
      },
    ],
  },
];

/** デフォルトの useExerciseSearch 返却値（全て表示・フィルターなし） */
const DEFAULT_SEARCH_STATE = {
  query: '',
  setQuery: jest.fn(),
  selectedCategory: null, // 全て表示中
  setSelectedCategory: jest.fn(),
  isLoading: false,
  loadExercises: jest.fn(),
  sections: TEST_SECTIONS,
  allExercises: TEST_SECTIONS[0]!.data,
};

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

// ExerciseReorderModal のモック（ボタン操作のみ検証するため内部実装は除外）
jest.mock('../../components/ExerciseReorderModal', () => ({
  ExerciseReorderModal: ({ visible }: { visible: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return visible ? React.createElement(Text, null, '並び替えモーダル') : null;
  },
}));

import { ExercisePickerScreen } from '../ExercisePickerScreen';

describe('ExercisePickerScreen - 追加済み種目の表示と操作（Issue #116）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトは全て表示（selectedCategory: null）
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
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

describe('ExercisePickerScreen - 並び替えボタン（Issue #141）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('ヘッダーに並び替えボタン（testID: reorder-button）が存在する', () => {
    render(<ExercisePickerScreen />);

    expect(screen.getByTestId('reorder-button')).toBeTruthy();
  });

  it('全て表示中（selectedCategory: null）は ⇅ ボタンが disabled になる', () => {
    // DEFAULT_SEARCH_STATE は selectedCategory: null
    render(<ExercisePickerScreen />);

    const button = screen.getByTestId('reorder-button');
    // disabled の TouchableOpacity は accessibilityState.disabled が true
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBe(true);
  });

  it('部位フィルター選択中（selectedCategory: "chest"）は ⇅ ボタンが有効になり、タップでモーダルが開く', () => {
    // 胸フィルターを選択している状態
    mockUseExerciseSearch.mockReturnValue({
      ...DEFAULT_SEARCH_STATE,
      selectedCategory: 'chest',
    });

    render(<ExercisePickerScreen />);

    // モーダルが閉じている状態を確認
    expect(screen.queryByText('並び替えモーダル')).toBeNull();

    // 並び替えボタンをタップ
    fireEvent.press(screen.getByTestId('reorder-button'));

    // モーダルが表示される
    expect(screen.getByText('並び替えモーダル')).toBeTruthy();
  });
});

describe('ExercisePickerScreen - カスタム種目追加 FAB（Issue #136）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('FAB が表示される（accessibilityLabel で検索）', () => {
    render(<ExercisePickerScreen />);

    expect(screen.getByLabelText('カスタム種目を追加')).toBeTruthy();
  });

  it('リスト末尾の「+ カスタム種目を追加」テキストボタンが表示されない', () => {
    render(<ExercisePickerScreen />);

    // 旧ボタンのテキストが存在しないことを確認
    expect(screen.queryByText('+ カスタム種目を追加')).toBeNull();
  });

  it('FAB をタップするとカスタム種目作成フォームが表示される', () => {
    render(<ExercisePickerScreen />);

    // FAB をタップ
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // フォーム内の「作成して追加」ボタンが表示される
    expect(screen.getByText('作成して追加')).toBeTruthy();
  });

  it('フォーム表示中は FAB が非表示になる', () => {
    render(<ExercisePickerScreen />);

    // FAB をタップしてフォームを表示
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // FAB が消えている
    expect(screen.queryByLabelText('カスタム種目を追加')).toBeNull();
  });
});
