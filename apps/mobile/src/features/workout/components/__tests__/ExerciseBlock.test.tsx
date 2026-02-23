/**
 * ExerciseBlock コンポーネントテスト
 *
 * 検証対象（Issue #138 インラインチップ形式）:
 * - 部位ラベルが非表示
 * - 前回記録チップ（前回 M/d、① kg×reps 形式）
 * - 前回記録なしの場合はチップ非表示
 * - カラムヘッダー行（Set / kg / rep / 1RM）
 * - 「+ セットを追加」テキストリンク
 * - 種目削除ボタン
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
  sortOrder: 1,
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

  // ---- Issue #138 前回セットインラインチップ ----

  describe('部位ラベル（Issue #138）', () => {
    it('部位ラベル（胸・背中など）が表示されないこと', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      // MUSCLE_GROUP_LABELS による変換後のテキストが表示されないこと
      expect(screen.queryByText('胸')).toBeNull();
    });
  });

  describe('前回記録インラインチップ（Issue #138）', () => {
    it('前回記録がある場合、日付テキスト「前回 2/20」が表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByText('前回 2/20')).toBeTruthy();
    });

    it('前回記録がある場合、1セット目のチップ「① 60×10」が表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByText('① 60×10')).toBeTruthy();
    });

    it('前回記録がある場合、2セット目のチップ「② 65×8」が表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByText('② 65×8')).toBeTruthy();
    });

    it('前回記録が null の場合、「前回」テキストが非表示', () => {
      render(<ExerciseBlock {...createDefaultProps({ previousRecord: null })} />);

      expect(screen.queryByText(/^前回/)).toBeNull();
    });

    it('セットの weight が null の場合、「-」で表示される', () => {
      const recordWithNullWeight: PreviousRecord = {
        sets: [
          {
            id: 'ps1',
            workoutExerciseId: 'pwe1',
            setNumber: 1,
            weight: null,
            reps: 10,
            estimated1RM: null,
            createdAt: 900,
            updatedAt: 900,
          },
        ],
        workoutDate: new Date('2026-02-20'),
      };
      render(<ExerciseBlock {...createDefaultProps({ previousRecord: recordWithNullWeight })} />);

      expect(screen.getByText('① -×10')).toBeTruthy();
    });
  });

  // ---- 種目削除ボタン ----

  describe('種目削除ボタン', () => {
    it('削除ボタンタップで onDeleteExercise が1回呼ばれる', () => {
      const mockOnDeleteExercise = jest.fn();
      render(<ExerciseBlock {...createDefaultProps({ onDeleteExercise: mockOnDeleteExercise })} />);

      fireEvent.press(screen.getByLabelText(`${EXERCISE_NAME}を削除`));

      expect(mockOnDeleteExercise).toHaveBeenCalledTimes(1);
    });

    it('前回記録が null でも削除ボタンは表示される', () => {
      render(<ExerciseBlock {...createDefaultProps({ previousRecord: null })} />);

      expect(screen.getByLabelText(`${EXERCISE_NAME}を削除`)).toBeTruthy();
    });
  });

  // ---- Issue #121 カードデザイン刷新 ----

  describe('カラムヘッダー行', () => {
    it('Set / kg / rep / 1RM のラベルが表示される（Issue #134: 回→rep）', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByText('Set')).toBeTruthy();
      expect(screen.getAllByText('kg').length).toBeGreaterThanOrEqual(1);
      // Issue #134: 「回」→「rep」に変更
      expect(screen.getAllByText('rep').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('1RM')).toBeTruthy();
    });

    it('カラムヘッダーに「回」が表示されないこと（Issue #134: 回→rep）', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.queryByText('回')).toBeNull();
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
      const container = screen.getByTestId('set-list-container');
      expect(container.props.style).toMatchObject({ gap: 12 });
    });
  });

  // ---- Issue #134 メモ入力 ----

  describe('メモ入力（Issue #134）', () => {
    it('メモ入力欄が表示される', () => {
      render(<ExerciseBlock {...createDefaultProps()} />);

      expect(screen.getByPlaceholderText('メモ（フォーム、体感など）')).toBeTruthy();
    });

    it('メモに文字を入力すると onMemoChange が呼ばれる', () => {
      const mockOnMemoChange = jest.fn();
      render(<ExerciseBlock {...createDefaultProps({ onMemoChange: mockOnMemoChange })} />);

      const memoInput = screen.getByPlaceholderText('メモ（フォーム、体感など）');
      fireEvent.changeText(memoInput, 'フォーム意識');

      expect(mockOnMemoChange).toHaveBeenCalledWith('フォーム意識');
    });

    it('memo prop に値がある場合、入力欄に表示される', () => {
      render(<ExerciseBlock {...createDefaultProps({ memo: '前回の感想' })} />);

      const memoInput = screen.getByPlaceholderText('メモ（フォーム、体感など）');
      expect(memoInput.props.value).toBe('前回の感想');
    });
  });
});
