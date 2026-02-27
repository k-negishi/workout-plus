/**
 * RecentWorkoutCard テスト
 *
 * Issue #132: ホーム画面「最近のトレーニング」表示改善
 * - 日付フォーマット: 「2月18日(火)」形式
 * - 部位名表示: 日付隣に部位名（例: 「胸・背中」）
 * - 種目数タグ化: subtitle からタグ行へ移動
 * - 総重量タグ削除
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { RecentWorkoutCard } from '../RecentWorkoutCard';

// date-fns/locale モック
jest.mock('date-fns/locale', () => ({
  ...jest.requireActual('date-fns/locale'),
}));

describe('RecentWorkoutCard 日付フォーマット', () => {
  it('「M月d日(E)」形式で日付を表示する', () => {
    // 2026-02-18 は水曜日
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('2月18日(水)')).toBeTruthy();
  });

  it('年を跨いでも正しくフォーマットされる', () => {
    // 2025-12-31 は水曜日
    const completedAt = new Date(2025, 11, 31, 15, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={1}
        setCount={3}
        totalVolume={100}
        durationSeconds={600}
        muscleGroups={['back']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('12月31日(水)')).toBeTruthy();
  });
});

describe('RecentWorkoutCard 部位名表示', () => {
  it('1つの部位が日本語で表示される', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('胸')).toBeTruthy();
  });

  it('複数の部位が中黒（・）区切りで表示される', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={5}
        setCount={15}
        totalVolume={3000}
        durationSeconds={5400}
        muscleGroups={['chest', 'back']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('胸・背中')).toBeTruthy();
  });

  it('部位が空配列のとき部位テキストを表示しない', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={1}
        setCount={3}
        totalVolume={100}
        durationSeconds={600}
        muscleGroups={[]}
        onPress={jest.fn()}
      />,
    );

    // 「胸」「背中」等の部位名がないことを確認
    expect(screen.queryByText(/胸|背中|脚|肩|二頭|三頭|腹筋/)).toBeNull();
  });
});

describe('RecentWorkoutCard タグ表示', () => {
  it('種目数タグが表示される', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('3種目')).toBeTruthy();
  });

  it('セット数タグが表示される', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('9セット')).toBeTruthy();
  });

  it('総重量タグが表示されない', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    // 「1,200kg」や「1.2t」が表示されないことを確認
    expect(screen.queryByText(/kg|t$/)).toBeNull();
  });

  it('所要時間タグが表示される', () => {
    const completedAt = new Date(2026, 1, 18, 10, 0, 0).getTime();

    render(
      <RecentWorkoutCard
        completedAt={completedAt}
        exerciseCount={3}
        setCount={9}
        totalVolume={1200}
        durationSeconds={3600}
        muscleGroups={['chest']}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('1時間0分')).toBeTruthy();
  });
});
