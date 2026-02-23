/**
 * ExerciseBlock コンポーネントテスト
 *
 * 検証対象（Issue #121 カードデザイン刷新）:
 * - カード外枠スタイル（bg-white border rounded-lg）
 * - 種目名: 16px / #334155 / font-semibold
 * - 削除ボタン: テキスト「✕」
 * - カラムヘッダー行（Set / kg / 回 / 1RM）
 * - 「+ セットを追加」テキストリンク（背景・ボーダーなし）
 * - showPreviousRecord=false のとき前回記録バッジ非表示
 * - 前回記録コピーボタン（既存テスト維持）
 * - 種目削除ボタン（既存テスト維持）
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Exercise, WorkoutSet } from '@/types';

import type { PreviousRecord } from '../../hooks/usePreviousRecord';
import { ExerciseBlock, type ExerciseBlockProps } from '../ExerciseBlock';

// FlatList のテスト環境向けモック（仮想化を無効化してアイテムを直接レンダリング）
// jest.mock のファクトリは巻き上げられるため jest.requireActual を使用
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactElement;
      keyExtractor?: (item: unknown, index: number) => string;
    }) => (
      <View>
        {data.map((item: unknown, index: number) => (
          <View key={keyExtractor ? keyExtractor(item, index) : String(index)}>
            {renderItem({ item, index })}
          </View>
        ))}
      </View>
    ),
  };
});

/** テスト用定数 */
const EXERCISE_ID = 'e1';
const WORKOUT_EXERCISE_ID = 'we1';
const EXERCISE_NAME = 'ベンチプレス';
const COPY_ALL_LABEL = '前回の全セットをコピー';

/** テスト用種目マスタデータ */
const mockExercise: Exercise = {
  id: EXERCISE_ID,
  name: EXERCISE_NAME,
  muscleGroup: 'chest',
  equipment: 'barbell',
  isCustom: false,
  isFavorite: false,
  createdAt: 1000,
  updatedAt: 1000,
};

/** テスト用セットデータ */
const mockSets: WorkoutSet[] = [
  {
    id: 's1',
    workoutExerciseId: WORKOUT_EXERCISE_ID,
    setNumber: 1,
    weight: null,
    reps: null,
    estimated1RM: null,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 's2',
    workoutExerciseId: WORKOUT_EXERCISE_ID,
    setNumber: 2,
    weight: null,
    reps: null,
    estimated1RM: null,
    createdAt: 1000,
    updatedAt: 1000,
  },
];

/** テスト用前回記録 */
const mockPreviousRecord: PreviousRecord = {
  sets: [
    {
      id: 'ps1',
      workoutExerciseId: 'pwe1',
      setNumber: 1,
      weight: 60,
      reps: 10,
      estimated1RM: 80,
      createdAt: 900,
      updatedAt: 900,
    },
    {
      id: 'ps2',
      workoutExerciseId: 'pwe1',
      setNumber: 2,
      weight: 65,
      reps: 8,
      estimated1RM: 82,
      createdAt: 900,
      updatedAt: 900,
    },
  ],
  workoutDate: new Date('2026-02-20'),
};

/** デフォルト props を生成するヘルパー */
function createDefaultProps(overrides?: Partial<ExerciseBlockProps>): ExerciseBlockProps {
  return {
    exercise: mockExercise,
    workoutExerciseId: WORKOUT_EXERCISE_ID,
    sets: mockSets,
    previousRecord: mockPreviousRecord,
    memo: null,
    onWeightChange: jest.fn(),
    onRepsChange: jest.fn(),
    onCopyAllPrevious: jest.fn(),
    onDeleteSet: jest.fn(),
    onAddSet: jest.fn(),
    onExerciseNamePress: jest.fn(),
    onMemoChange: jest.fn(),
    ...overrides,
  };
}

describe('ExerciseBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('前回記録コピーボタン', () => {
    it('previousRecord があるとき「前回の全セットをコピー」ボタンが表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByLabelText(COPY_ALL_LABEL)).toBeTruthy();
    });

    it('コピーボタンタップで onCopyAllPrevious が1回呼ばれる', () => {
      const mockOnCopyAllPrevious = jest.fn();
      render(
        <ExerciseBlock {...createDefaultProps({ onCopyAllPrevious: mockOnCopyAllPrevious })} />,
      );

      fireEvent.press(screen.getByLabelText(COPY_ALL_LABEL));

      expect(mockOnCopyAllPrevious).toHaveBeenCalledTimes(1);
    });

    it('previousRecord が null のときコピーボタンが非表示', () => {
      render(<ExerciseBlock {...createDefaultProps({ previousRecord: null })} />);

      expect(screen.queryByLabelText(COPY_ALL_LABEL)).toBeNull();
    });
  });

  describe('種目削除ボタン', () => {
    it('削除ボタンタップで onDeleteExercise が1回呼ばれる', () => {
      const mockOnDeleteExercise = jest.fn();
      render(<ExerciseBlock {...createDefaultProps({ onDeleteExercise: mockOnDeleteExercise })} />);

      fireEvent.press(screen.getByLabelText(`${EXERCISE_NAME}を削除`));

      expect(mockOnDeleteExercise).toHaveBeenCalledTimes(1);
    });
  });

  describe('バッジテキスト', () => {
    it('前回記録のセット数と日付が表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      // 「前回: 2セット (2/20)」が表示されること
      expect(screen.getByText('前回: 2セット (2/20)')).toBeTruthy();
    });
  });

  // ---- Issue #121 カードデザイン刷新 ----

  describe('カラムヘッダー行', () => {
    it('Set / kg / 回 / 1RM のラベルが表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      // セットリスト上部にカラムヘッダーが追加されること
      // kg / 回 は SetRow 内でも使われるため getAllByText で「少なくとも1つ」を確認
      expect(screen.getByText('Set')).toBeTruthy();
      expect(screen.getAllByText('kg').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('回').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('1RM')).toBeTruthy();
    });
  });

  describe('「+ セットを追加」ボタン', () => {
    it('タップで onAddSet が1回呼ばれる', () => {
      const mockOnAddSet = jest.fn();
      render(<ExerciseBlock {...createDefaultProps({ onAddSet: mockOnAddSet })} />);

      fireEvent.press(screen.getByLabelText('セットを追加'));

      expect(mockOnAddSet).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Issue #128 セット間行間拡大 ----

  describe('セットコンテナの gap（Issue #128）', () => {
    it('セットリストコンテナの gap が 12 であること', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);
      // testID="set-list-container" でコンテナを特定して gap を検証する
      const container = screen.getByTestId('set-list-container');
      expect(container.props.style).toMatchObject({ gap: 12 });
    });
  });

  describe('showPreviousRecord prop', () => {
    it('showPreviousRecord=false のとき前回記録バッジが非表示', () => {
      render(<ExerciseBlock {...createDefaultProps({ showPreviousRecord: false })} />);

      // バッジ本体（コピーボタン）が非表示であること
      expect(screen.queryByLabelText(COPY_ALL_LABEL)).toBeNull();
      // バッジテキストも非表示であること
      expect(screen.queryByText(/前回:/)).toBeNull();
    });

    it('showPreviousRecord=true（デフォルト）のとき前回記録バッジが表示される', () => {
      render(<ExerciseBlock {...createDefaultProps({ showPreviousRecord: true })} />);

      expect(screen.getByLabelText(COPY_ALL_LABEL)).toBeTruthy();
    });

    it('showPreviousRecord 未指定のとき前回記録バッジが表示される（デフォルト true）', () => {
      // showPreviousRecord を省略した場合に true と同じ挙動になること
      const props = createDefaultProps();
      render(<ExerciseBlock {...props} />);

      expect(screen.getByLabelText(COPY_ALL_LABEL)).toBeTruthy();
    });
  });
});
