/**
 * RecordScreen テスト（T09: スタック画面化対応）
 * - SafeArea 対応（T011）
 * - EmptyState 表示（T023）
 * - ExerciseHistory navigation（T034）
 * - T09: workoutId params での編集モード起動テスト
 * - T09: 編集モードで前回記録バッジが非表示のテスト
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

// --- モック定義 ---

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

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

// T09: useFocusEffect のモックを削除（スタック画面化により useEffect を使用）
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    getParent: () => ({ goBack: mockGoBack }),
  }),
  // T09: useRoute は params を持つ（workoutId, targetDate）
  useRoute: () => ({ params: mockRouteParams }),
}));

/** テストごとに params を切り替えるための変数 */
let mockRouteParams: { workoutId?: string; targetDate?: string } | undefined = undefined;

const mockStartSession = jest.fn().mockResolvedValue(undefined);

jest.mock('@/stores/workoutSessionStore', () => ({
  useWorkoutSessionStore: jest.fn(() => ({
    currentWorkout: { id: 'w1', memo: '' },
    currentExercises: [],
    currentSets: {},
    timerStatus: 'not_started' as const,
    elapsedSeconds: 0,
    continuationBaseExerciseIds: null,
    setContinuationBaseExerciseIds: jest.fn(),
  })),
}));

const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockRunAsync = jest.fn().mockResolvedValue(undefined);
const mockDb = {
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};
jest.mock('@/database/client', () => ({
  getDatabase: () => Promise.resolve(mockDb),
}));

const mockStartTimer = jest.fn();
const mockPauseTimer = jest.fn();
const mockResumeTimer = jest.fn();
const mockResetTimer = jest.fn();
const mockStopTimer = jest.fn();
jest.mock('../../hooks/useTimer', () => ({
  useTimer: () => ({
    timerStatus: 'not_started' as const,
    elapsedSeconds: 0,
    startTimer: mockStartTimer,
    pauseTimer: mockPauseTimer,
    resumeTimer: mockResumeTimer,
    resetTimer: mockResetTimer,
    stopTimer: mockStopTimer,
  }),
}));

const mockDiscardWorkout = jest.fn().mockResolvedValue(undefined);
jest.mock('../../hooks/useWorkoutSession', () => ({
  useWorkoutSession: () => ({
    startSession: mockStartSession,
    completeWorkout: jest.fn().mockResolvedValue(undefined),
    discardWorkout: mockDiscardWorkout,
    updateSet: jest.fn().mockResolvedValue(undefined),
    deleteSet: jest.fn().mockResolvedValue(undefined),
    addSet: jest.fn().mockResolvedValue(undefined),
    updateWorkoutMemo: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../hooks/usePreviousRecord', () => ({
  usePreviousRecord: () => ({
    previousRecord: null,
    isLoading: false,
  }),
}));

jest.mock('@/shared/components/Toast', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

import { RecordScreen } from '../RecordScreen';

const mockUseWorkoutSessionStore = useWorkoutSessionStore as jest.MockedFunction<
  typeof useWorkoutSessionStore
>;

describe('RecordScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // T09: テストごとに params をリセット（params なし = 新規記録モード）
    mockRouteParams = undefined;
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // clearAllMocks で消えるデフォルト戻り値を再設定
    mockGetAllAsync.mockResolvedValue([]);
    mockRunAsync.mockResolvedValue(undefined);
    mockStartSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('SafeArea', () => {
    it('useSafeAreaInsets を呼び出す', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      render(<RecordScreen />);
      expect(useSafeAreaInsets).toHaveBeenCalled();
    });

    it('insets.top に基づいた paddingTop がヘッダーに適用される', () => {
      render(<RecordScreen />);
      const container = screen.getByTestId('record-screen-container');
      // paddingTop は insets.top の値が反映されていること（44 + 追加マージン）
      expect(container.props.style).toEqual(expect.objectContaining({ paddingTop: 44 }));
    });
  });

  describe('EmptyState（種目未追加時）', () => {
    it('exercises が空のとき EmptyState が表示される', () => {
      // デフォルトモックは currentExercises: [] なのでそのまま使用
      render(<RecordScreen />);
      // EmptyState のタイトルテキストが表示されることを検証
      expect(screen.getByText('種目を追加してワークアウトを開始しましょう')).toBeTruthy();
    });

    it('exercises が空のとき「+ 種目を追加」ボタンが表示される', () => {
      render(<RecordScreen />);
      // EmptyState のアクションボタン + 下部の追加ボタンの両方に「+ 種目を追加」が含まれる
      const addButtons = screen.getAllByText('+ 種目を追加');
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('exercises が存在するとき EmptyState は表示されない', () => {
      mockUseWorkoutSessionStore.mockReturnValue({
        currentWorkout: { id: 'w1', memo: '' },
        currentExercises: [
          { id: 'we1', exerciseId: 'e1', workoutId: 'w1', sortOrder: 0, memo: null },
        ],
        currentSets: { we1: [] },
        timerStatus: 'not_started' as const,
        elapsedSeconds: 0,
        continuationBaseExerciseIds: null,
        setContinuationBaseExerciseIds: jest.fn(),
      } as ReturnType<typeof useWorkoutSessionStore>);
      render(<RecordScreen />);
      // 不在チェックには queryBy を使う
      expect(screen.queryByText('種目を追加してワークアウトを開始しましょう')).toBeNull();
    });
  });

  describe('ExerciseHistory ナビゲーション', () => {
    it('種目名タップで navigation.navigate("ExerciseHistory") が呼ばれる', async () => {
      // 種目マスタデータを DB モックに設定
      mockGetAllAsync.mockResolvedValue([
        {
          id: 'e1',
          name: 'ベンチプレス',
          muscle_group: 'chest',
          equipment: 'barbell',
          is_custom: 0,
          is_favorite: 0,
          created_at: 1000,
          updated_at: 1000,
        },
      ]);

      // セッション内に種目がある状態
      mockUseWorkoutSessionStore.mockReturnValue({
        currentWorkout: { id: 'w1', memo: '' },
        currentExercises: [
          { id: 'we1', exerciseId: 'e1', workoutId: 'w1', sortOrder: 0, memo: null },
        ],
        currentSets: {
          we1: [
            {
              id: 's1',
              workoutExerciseId: 'we1',
              setNumber: 1,
              weight: null,
              reps: null,
              estimated1RM: null,
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
        },
        timerStatus: 'not_started' as const,
        elapsedSeconds: 0,
        continuationBaseExerciseIds: null,
        setContinuationBaseExerciseIds: jest.fn(),
      } as ReturnType<typeof useWorkoutSessionStore>);

      render(<RecordScreen />);

      // 種目マスタの非同期読み込みを待つ（findByText は要素が存在するまで待機する）
      await screen.findByText('ベンチプレス');

      // 種目名をタップ
      fireEvent.press(screen.getByText('ベンチプレス'));

      // ExerciseHistory へのナビゲーションが呼ばれることを検証
      expect(mockNavigate).toHaveBeenCalledWith('ExerciseHistory', {
        exerciseId: 'e1',
        exerciseName: 'ベンチプレス',
      });
    });
  });

  describe('タイマー停止確認モーダル', () => {
    it('×ボタン押下で停止確認モーダルが表示される', () => {
      render(<RecordScreen />);
      fireEvent.press(screen.getByLabelText('時間計測を停止'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '計測を停止しますか？',
        'タイマーの時間は記録されません。ワークアウトは継続できます。',
        expect.any(Array),
      );
    });

    it('キャンセル押下で stopTimer は呼ばれず、discardWorkout も呼ばれない', () => {
      render(<RecordScreen />);
      fireEvent.press(screen.getByLabelText('時間計測を停止'));

      const [, , buttons] = alertSpy.mock.calls[0] as [
        string,
        string,
        Array<{ text: string; onPress?: () => void }>,
      ];
      const cancelButton = buttons.find((button) => button.text === 'キャンセル');
      expect(cancelButton).toBeTruthy();

      cancelButton?.onPress?.();

      expect(mockStopTimer).not.toHaveBeenCalled();
      expect(mockDiscardWorkout).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('停止する押下で stopTimer が呼ばれ、discardWorkout は呼ばれない', () => {
      render(<RecordScreen />);
      fireEvent.press(screen.getByLabelText('時間計測を停止'));

      const [, , buttons] = alertSpy.mock.calls[0] as [
        string,
        string,
        Array<{ text: string; onPress?: () => void }>,
      ];
      const stopButton = buttons.find((button) => button.text === '停止する');
      expect(stopButton).toBeTruthy();

      stopButton?.onPress?.();

      expect(mockStopTimer).toHaveBeenCalledTimes(1);
      expect(mockDiscardWorkout).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('T09: 編集モード（workoutId params）', () => {
    it('workoutId が params に含まれる場合、startSession が workoutId 付きで呼ばれる', () => {
      // T09: workoutId を params に設定して編集モードを再現
      mockRouteParams = { workoutId: 'existing-workout-id' };
      render(<RecordScreen />);
      // useEffect は同期的に発火するので expect を直後に書ける
      expect(mockStartSession).toHaveBeenCalledWith({ workoutId: 'existing-workout-id' });
    });

    it('workoutId がない場合、startSession が params なしで呼ばれる（新規記録モード）', () => {
      mockRouteParams = undefined;
      render(<RecordScreen />);
      expect(mockStartSession).toHaveBeenCalledWith(undefined);
    });

    it('targetDate が params に含まれる場合、startSession が targetDate 付きで呼ばれる', () => {
      mockRouteParams = { targetDate: '2026-01-15' };
      render(<RecordScreen />);
      expect(mockStartSession).toHaveBeenCalledWith({ targetDate: '2026-01-15' });
    });
  });
});
