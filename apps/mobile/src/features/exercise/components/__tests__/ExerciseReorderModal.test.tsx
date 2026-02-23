/**
 * ExerciseReorderModal テスト
 *
 * - visible=true のとき全種目が表示される
 * - 各種目行にドラッグハンドル（testID: drag-handle-{id}）が表示される
 * - 「キャンセル」タップで onClose が呼ばれる
 * - 「保存」タップで onSave に現在の順序が渡される
 * - visible=false のときは描画されない
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// react-native-draggable-flatlist のモック
// ドラッグ操作はネイティブAPIに依存するためユニットテストでは除外し、
// 描画・ボタン操作のみ検証する
jest.mock('react-native-draggable-flatlist', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  // DraggableFlatList を通常の FlatList 相当として実装
  // renderItem に drag=jest.fn() を渡してドラッグハンドルの描画をシミュレートする
  function MockDraggableFlatList({
    data,
    renderItem,
    keyExtractor,
  }: {
    data: unknown[];
    renderItem: (info: { item: unknown; drag: () => void; isActive: boolean }) => React.ReactNode;
    keyExtractor?: (item: unknown) => string;
  }) {
    return React.createElement(
      View,
      null,
      data.map((item, index) =>
        React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item) : String(index) },
          renderItem({ item, drag: jest.fn(), isActive: false }),
        ),
      ),
    );
  }

  return {
    __esModule: true,
    default: MockDraggableFlatList,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

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

import type { Exercise } from '@/types';

import { ExerciseReorderModal } from '../ExerciseReorderModal';

/** テスト用の種目一覧 */
const makeExercises = (): Exercise[] => [
  {
    id: 'ex-1',
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
    id: 'ex-2',
    name: 'スクワット',
    muscleGroup: 'legs',
    equipment: 'barbell',
    isCustom: false,
    isFavorite: false,
    createdAt: 2000,
    updatedAt: 2000,
    sortOrder: 2,
  },
  {
    id: 'ex-3',
    name: 'デッドリフト',
    muscleGroup: 'back',
    equipment: 'barbell',
    isCustom: false,
    isFavorite: false,
    createdAt: 3000,
    updatedAt: 3000,
    sortOrder: 3,
  },
];

describe('ExerciseReorderModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visible=true のとき全種目名が表示される', () => {
    render(
      <ExerciseReorderModal
        visible={true}
        exercises={makeExercises()}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('ベンチプレス')).toBeTruthy();
    expect(screen.getByText('スクワット')).toBeTruthy();
    expect(screen.getByText('デッドリフト')).toBeTruthy();
  });

  it('各種目行にドラッグハンドル（testID: drag-handle-{id}）が表示される', () => {
    const exercises = makeExercises();
    render(
      <ExerciseReorderModal
        visible={true}
        exercises={exercises}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />,
    );

    for (const ex of exercises) {
      expect(screen.getByTestId(`drag-handle-${ex.id}`)).toBeTruthy();
    }
  });

  it('「キャンセル」タップで onClose が呼ばれる', () => {
    render(
      <ExerciseReorderModal
        visible={true}
        exercises={makeExercises()}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByText('キャンセル'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('「保存する」タップで onSave に現在の順序が渡される', () => {
    const exercises = makeExercises();
    render(
      <ExerciseReorderModal
        visible={true}
        exercises={exercises}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByText('保存する'));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    // 変更なしで保存した場合は初期の順序（exercises と同じ内容）が渡される
    const savedExercises = mockOnSave.mock.calls[0]?.[0] as Exercise[];
    expect(savedExercises).toHaveLength(exercises.length);
    expect(savedExercises.map((e) => e.id)).toEqual(exercises.map((e) => e.id));
  });

  it('visible=false のときは種目が描画されない', () => {
    render(
      <ExerciseReorderModal
        visible={false}
        exercises={makeExercises()}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />,
    );

    expect(screen.queryByText('ベンチプレス')).toBeNull();
    expect(screen.queryByText('スクワット')).toBeNull();
  });
});
