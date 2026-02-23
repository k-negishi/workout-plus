/**
 * ExerciseSortChips テスト
 *
 * ソートチップUIコンポーネントの表示・操作を検証する。
 *
 * Red フェーズ: ExerciseSortChips コンポーネントが存在する前に記述する。
 * 実装後に Green になることを確認する。
 */
import { fireEvent,render, screen } from '@testing-library/react-native';
import React from 'react';

import type { ExerciseSortOrder } from '@/types';

import { ExerciseSortChips } from '../ExerciseSortChips';

describe('ExerciseSortChips', () => {
  const onSortChangeMock = jest.fn();

  beforeEach(() => {
    onSortChangeMock.mockClear();
  });

  describe('表示', () => {
    it('4つのソートチップをすべて表示する', () => {
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      expect(screen.getByText('名前順')).toBeTruthy();
      expect(screen.getByText('部位別')).toBeTruthy();
      expect(screen.getByText('追加日順')).toBeTruthy();
      expect(screen.getByText('よく使う順')).toBeTruthy();
    });

    it('選択中のチップ（name）がアクティブ状態で表示される', () => {
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      // アクティブなチップには testID または accessibility で識別する
      const activeChip = screen.getByTestId('sort-chip-name-active');
      expect(activeChip).toBeTruthy();
    });

    it('選択中のチップ（muscle）がアクティブ状態で表示される', () => {
      render(
        <ExerciseSortChips sortOrder="muscle" onSortChange={onSortChangeMock} />,
      );
      const activeChip = screen.getByTestId('sort-chip-muscle-active');
      expect(activeChip).toBeTruthy();
    });

    it('選択中のチップ（date）がアクティブ状態で表示される', () => {
      render(
        <ExerciseSortChips sortOrder="date" onSortChange={onSortChangeMock} />,
      );
      expect(screen.getByTestId('sort-chip-date-active')).toBeTruthy();
    });

    it('選択中のチップ（frequency）がアクティブ状態で表示される', () => {
      render(
        <ExerciseSortChips sortOrder="frequency" onSortChange={onSortChangeMock} />,
      );
      expect(screen.getByTestId('sort-chip-frequency-active')).toBeTruthy();
    });
  });

  describe('操作', () => {
    it('部位別チップをタップすると onSortChange("muscle") が呼ばれる', () => {
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      fireEvent.press(screen.getByText('部位別'));
      expect(onSortChangeMock).toHaveBeenCalledTimes(1);
      expect(onSortChangeMock).toHaveBeenCalledWith('muscle' as ExerciseSortOrder);
    });

    it('追加日順チップをタップすると onSortChange("date") が呼ばれる', () => {
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      fireEvent.press(screen.getByText('追加日順'));
      expect(onSortChangeMock).toHaveBeenCalledWith('date' as ExerciseSortOrder);
    });

    it('よく使う順チップをタップすると onSortChange("frequency") が呼ばれる', () => {
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      fireEvent.press(screen.getByText('よく使う順'));
      expect(onSortChangeMock).toHaveBeenCalledWith('frequency' as ExerciseSortOrder);
    });

    it('名前順チップをタップすると onSortChange("name") が呼ばれる', () => {
      render(
        <ExerciseSortChips sortOrder="frequency" onSortChange={onSortChangeMock} />,
      );
      fireEvent.press(screen.getByText('名前順'));
      expect(onSortChangeMock).toHaveBeenCalledWith('name' as ExerciseSortOrder);
    });

    it('現在選択中のチップをタップしても onSortChange が呼ばれる', () => {
      // 再選択を明示的に許可する（コールバックの呼び出し自体は親が制御する）
      render(
        <ExerciseSortChips sortOrder="name" onSortChange={onSortChangeMock} />,
      );
      fireEvent.press(screen.getByText('名前順'));
      expect(onSortChangeMock).toHaveBeenCalledWith('name' as ExerciseSortOrder);
    });
  });
});
