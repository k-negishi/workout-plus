/**
 * ExercisePickerScreen テスト（Issue #116, #136, #142, #180, #184）
 * - 追加済み種目に「追加済み」バッジが表示される
 * - 追加済み種目をタップしても session.addExercise が呼ばれない
 * - 未追加種目をタップすると session.addExercise が呼ばれる
 * - Issue #136: カスタム種目追加 FAB が画面右下に表示される
 * - Issue #142: ヘッダースタイル統一（Ionicons chevron-back を使用）
 * - Issue #184: 種目タップ後 goBack() が即座に呼ばれる（addExercise 完了を待たない）
 * - Issue #180: FAB タップ後のフォーム表示でスクロールが起きない（autoFocus なし）
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

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

// Issue #155: react-native-gesture-handler の Swipeable をモック
// テスト環境では renderRightActions を即座に呼び出して右アクションを描画する
jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Swipeable: ({
      children,
      renderRightActions,
    }: {
      children: React.ReactNode;
      renderRightActions?: () => React.ReactNode;
    }) =>
      React.createElement(View, null, children, renderRightActions ? renderRightActions() : null),
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
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
const mockFindByExactName = jest.fn();
const mockCreate = jest.fn();
const mockRestore = jest.fn();
jest.mock('@/database/repositories/exercise', () => ({
  ExerciseRepository: {
    toggleFavorite: jest.fn(),
    create: (...args: unknown[]) => mockCreate(...args),
    update: jest.fn(),
    findByExactName: (...args: unknown[]) => mockFindByExactName(...args),
    restore: (...args: unknown[]) => mockRestore(...args),
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
    abs: '腹筋',
    other: 'その他',
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
        isFavorite: false,
        isDeleted: false,
        createdAt: 1000,
        updatedAt: 1000,
        sortOrder: 1,
      },
      {
        id: 'exercise-squat',
        name: 'スクワット',
        muscleGroup: 'legs',
        equipment: 'barbell',
        isFavorite: false,
        isDeleted: false,
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

describe('ExercisePickerScreen - Issue #142: ヘッダースタイル統一', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('ヘッダーに testID "exercise-picker-header" が存在する', () => {
    render(<ExercisePickerScreen />);

    expect(screen.getByTestId('exercise-picker-header')).toBeTruthy();
  });

  it('戻るボタンが accessibilityLabel="戻る" で存在する', () => {
    render(<ExercisePickerScreen />);

    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('戻るボタンを押すと goBack() が呼ばれる', () => {
    render(<ExercisePickerScreen />);

    fireEvent.press(screen.getByLabelText('戻る'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('ヘッダータイトル「種目を選択」が表示される', () => {
    render(<ExercisePickerScreen />);

    expect(screen.getByText('種目を選択')).toBeTruthy();
  });
});

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

describe('ExercisePickerScreen - お気に入りトグルの即時反映（Issue #186）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('お気に入りボタンを押すとloadExercisesが呼ばれてリストが再取得される', async () => {
    const mockLoadExercises = jest.fn().mockResolvedValue(undefined);
    mockUseExerciseSearch.mockReturnValue({
      ...DEFAULT_SEARCH_STATE,
      loadExercises: mockLoadExercises,
    });

    render(<ExercisePickerScreen />);

    // スクワット（未追加種目）のお気に入りボタンをタップ
    const favoriteButtons = screen.getAllByLabelText('お気に入りに追加');
    // スクワットのお気に入りボタンをタップ（ベンチプレスも isFavorite: false なので2つある）
    fireEvent.press(favoriteButtons[0]!);

    // DB更新後にloadExercisesが呼ばれることを確認
    // handleToggleFavoriteはasyncなのでmicrotask完了を待つ
    await screen.findByText('スクワット');
    expect(mockLoadExercises).toHaveBeenCalledTimes(1);
  });

  it('お気に入り解除時もloadExercisesが呼ばれる', async () => {
    const mockLoadExercises = jest.fn().mockResolvedValue(undefined);
    // お気に入り登録済みの種目を含むセクション
    const sectionsWithFavorite = [
      {
        title: 'お気に入り',
        data: [
          {
            id: 'exercise-bench',
            name: 'ベンチプレス',
            muscleGroup: 'chest',
            equipment: 'barbell',
            isFavorite: true,
            isDeleted: false,
            createdAt: 1000,
            updatedAt: 1000,
            sortOrder: 1,
          },
        ],
      },
      {
        title: 'テスト種目',
        data: [
          {
            id: 'exercise-squat',
            name: 'スクワット',
            muscleGroup: 'legs',
            equipment: 'barbell',
            isFavorite: false,
            isDeleted: false,
            createdAt: 1000,
            updatedAt: 1000,
            sortOrder: 2,
          },
        ],
      },
    ];

    mockUseExerciseSearch.mockReturnValue({
      ...DEFAULT_SEARCH_STATE,
      sections: sectionsWithFavorite,
      allExercises: sectionsWithFavorite.flatMap((s) => s.data),
      loadExercises: mockLoadExercises,
    });

    render(<ExercisePickerScreen />);

    // お気に入り解除ボタン（ベンチプレスは isFavorite: true）をタップ
    const unfavoriteButton = screen.getByLabelText('お気に入り解除');
    fireEvent.press(unfavoriteButton);

    await screen.findByText('ベンチプレス');
    expect(mockLoadExercises).toHaveBeenCalledTimes(1);
  });
});

describe('ExercisePickerScreen - 左スワイプ「履歴」ボタン（Issue #155）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('Swipeable の renderRightActions で「履歴」ボタンが描画される', () => {
    render(<ExercisePickerScreen />);
    // モックの Swipeable は renderRightActions を即座にレンダリングする
    // 種目ごとに testID が付与されている
    expect(screen.getByTestId('history-button-exercise-bench')).toBeTruthy();
    expect(screen.getByTestId('history-button-exercise-squat')).toBeTruthy();
  });

  it('「履歴」ボタンタップで ExerciseHistory に navigate される', () => {
    render(<ExercisePickerScreen />);
    // スワイプ後の「履歴」ボタン（スクワット）をタップ
    fireEvent.press(screen.getByTestId('history-button-exercise-squat'));
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseHistory', {
      exerciseId: 'exercise-squat',
      exerciseName: 'スクワット',
    });
  });

  it('行タップによる種目選択は変更なし（single モード）', () => {
    render(<ExercisePickerScreen />);
    // スクワット（未追加）をタップ
    fireEvent.press(screen.getByText('スクワット'));
    expect(mockAddExercise).toHaveBeenCalledWith('exercise-squat');
  });
});

describe('ExercisePickerScreen - 種目タップ後の即時画面遷移（Issue #184）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('種目タップ後 addExercise の完了を待たずに goBack() が即座に呼ばれる', () => {
    // addExercise を解決しない Promise にして「未完了の非同期処理」を模倣する
    // goBack() が addExercise 完了前に呼ばれることを検証する
    mockAddExercise.mockReturnValue(new Promise(() => {}));

    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByText('スクワット'));

    // addExercise はまだ解決していないが、goBack() は同期的に呼ばれるはず
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('addExercise は goBack() 後もバックグラウンドで呼ばれる', () => {
    mockAddExercise.mockResolvedValue(undefined);

    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByText('スクワット'));

    // goBack() が呼ばれていることを確認
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    // addExercise も呼ばれていることを確認（バックグラウンド実行）
    expect(mockAddExercise).toHaveBeenCalledWith('exercise-squat');
  });
});

describe('ExercisePickerScreen - FAB タップ後のスクロール抑制（Issue #180）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('FAB タップ後に表示されるフォームの TextInput に autoFocus が設定されていない', () => {
    render(<ExercisePickerScreen />);

    // FAB をタップしてフォームを表示
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // フォーム内の TextInput（種目名入力欄）を取得する
    // autoFocus が true だとソフトウェアキーボード起動によるスクロールが発生する
    const textInput = screen.getByPlaceholderText('種目名を入力');
    expect(textInput.props.autoFocus).toBeFalsy();
  });
});

describe('ExercisePickerScreen - チップボタンのスタイル（Issue #205）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  /**
   * testID="muscle-chip-{key}" でチップを特定し、style 関数を呼び出してボーダー色と背景色を検証する。
   * - Pressable の style prop は ({ pressed }) => ({...}) 形式の関数
   * - pressed: false の状態でスタイルを評価する
   */
  it('未選択の部位チップ（背中）は #CBD5E1 のボーダーと #FAFBFC の背景を持つ', () => {
    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 初期状態では newMuscleGroup === 'chest' なので「背中」は未選択
    const chip = screen.getByTestId('muscle-chip-back');
    const style =
      typeof chip.props.style === 'function'
        ? chip.props.style({ pressed: false })
        : chip.props.style;

    expect(style.borderColor).toBe('#CBD5E1');
    expect(style.backgroundColor).toBe('#FAFBFC');
  });

  it('選択中の部位チップ（胸、初期値）は #4D94FF のボーダーと #E6F2FF の背景を持つ', () => {
    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 初期状態では newMuscleGroup === 'chest' なので「胸」は選択済み
    const chip = screen.getByTestId('muscle-chip-chest');
    const style =
      typeof chip.props.style === 'function'
        ? chip.props.style({ pressed: false })
        : chip.props.style;

    expect(style.borderColor).toBe('#4D94FF');
    expect(style.backgroundColor).toBe('#E6F2FF');
  });

  it('未選択の器具チップ（ダンベル）は #CBD5E1 のボーダーと #FAFBFC の背景を持つ', () => {
    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 初期値は newEquipment === 'barbell' なので「ダンベル」は未選択
    const chip = screen.getByTestId('equipment-chip-dumbbell');
    const style =
      typeof chip.props.style === 'function'
        ? chip.props.style({ pressed: false })
        : chip.props.style;

    expect(style.borderColor).toBe('#CBD5E1');
    expect(style.backgroundColor).toBe('#FAFBFC');
  });

  it('選択中の器具チップ（バーベル、初期値）は #4D94FF のボーダーと #E6F2FF の背景を持つ', () => {
    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 初期状態では newEquipment === 'barbell' なので「バーベル」は選択済み
    const chip = screen.getByTestId('equipment-chip-barbell');
    const style =
      typeof chip.props.style === 'function'
        ? chip.props.style({ pressed: false })
        : chip.props.style;

    expect(style.borderColor).toBe('#4D94FF');
    expect(style.backgroundColor).toBe('#E6F2FF');
  });
});

describe('ExercisePickerScreen - 種目名重複登録不可（Issue #205）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('フォームに「その他」部位チップが表示される', () => {
    render(<ExercisePickerScreen />);
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 部位「その他」チップが存在すること
    const otherChips = screen.getAllByText('その他');
    // 部位・器具それぞれに「その他」があるので 2 件以上
    expect(otherChips.length).toBeGreaterThanOrEqual(2);
  });

  it('重複する種目名を登録しようとするとエラーダイアログが表示される', async () => {
    // findByExactName が既存の種目を返す（重複あり）
    mockFindByExactName.mockResolvedValue({
      id: 'existing',
      name: 'ベンチプレス',
      muscle_group: 'chest',
      equipment: 'barbell',
    });

    render(<ExercisePickerScreen />);

    // FAB をタップしてフォームを表示
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));

    // 種目名を入力（既存と重複）
    fireEvent.changeText(screen.getByPlaceholderText('種目名を入力'), 'ベンチプレス');

    // 「作成して追加」ボタンをタップ
    fireEvent.press(screen.getByText('作成して追加'));

    // エラーダイアログが表示されること
    await screen.findByText('同じ名前の種目がすでに存在します');

    // create は呼ばれないこと
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ユニークな種目名を登録するとエラーダイアログは表示されない', async () => {
    // findByExactName が null を返す（重複なし）
    mockFindByExactName.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'new-exercise',
      name: '新しい種目',
      muscle_group: 'chest',
      equipment: 'barbell',
      is_favorite: 0,
      is_deleted: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      sort_order: 10,
    });

    render(<ExercisePickerScreen />);

    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));
    fireEvent.changeText(screen.getByPlaceholderText('種目名を入力'), '新しい種目');
    fireEvent.press(screen.getByText('作成して追加'));

    // create が呼ばれること
    await screen.findByText('種目を選択');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: '新しい種目' }));
  });
});

describe('ExercisePickerScreen - 削除済み種目の復元フロー（Issue #207）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExerciseSearch.mockReturnValue(DEFAULT_SEARCH_STATE);
  });

  it('削除済み種目と同名の種目を作成しようとすると復元ダイアログが表示される', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    // findByExactName が削除済み種目を返す
    mockFindByExactName.mockResolvedValue({
      id: 'deleted-ex',
      name: 'ベンチプレス',
      is_deleted: 1,
      muscle_group: 'chest',
      equipment: 'barbell',
      is_favorite: 0,
      created_at: 123,
      updated_at: 123,
      sort_order: 1,
    });

    render(<ExercisePickerScreen />);

    // FABタップ → 種目名入力 → 作成ボタンタップ
    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));
    fireEvent.changeText(screen.getByPlaceholderText('種目名を入力'), 'ベンチプレス');
    fireEvent.press(screen.getByText('作成して追加'));

    // 復元ダイアログが表示されること
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '削除済み種目の復元',
        expect.stringContaining('ベンチプレス'),
        expect.any(Array),
      );
    });

    // 新規作成は呼ばれないこと
    expect(mockCreate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('復元ダイアログで「復元する」を選択すると restore が呼ばれる', async () => {
    mockRestore.mockResolvedValue(undefined);
    mockFindByExactName.mockResolvedValue({
      id: 'deleted-ex',
      name: 'ベンチプレス',
      is_deleted: 1,
      muscle_group: 'chest',
      equipment: 'barbell',
      is_favorite: 0,
      created_at: 123,
      updated_at: 123,
      sort_order: 1,
    });

    // Alert.alert の第3引数（ボタン配列）から「復元する」ボタンの onPress を取り出して実行する
    let restoreOnPress: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const restoreButton = (buttons as Array<{ text: string; onPress?: () => void }>).find(
        (b) => b.text === '復元する',
      );
      restoreOnPress = restoreButton?.onPress;
    });

    render(<ExercisePickerScreen />);

    fireEvent.press(screen.getByLabelText('カスタム種目を追加'));
    fireEvent.changeText(screen.getByPlaceholderText('種目名を入力'), 'ベンチプレス');
    fireEvent.press(screen.getByText('作成して追加'));

    // alertSpy が呼ばれてから restoreOnPress を実行する
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    restoreOnPress?.();

    // restore が deleted-ex を引数として呼ばれること
    await waitFor(() => {
      expect(mockRestore).toHaveBeenCalledWith('deleted-ex');
    });

    alertSpy.mockRestore();
  });
});
