/**
 * TimerBar コンポーネントテスト
 *
 * 終了ボタンの文言・アクセシビリティラベル・
 * discarded 状態での再生ボタン disabled を検証する。
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { TimerStatus } from '@/types';

import { TimerBar } from '../TimerBar';

describe('TimerBar - ボタン文言', () => {
  const defaultProps = {
    timerStatus: TimerStatus.NOT_STARTED,
    elapsedSeconds: 0,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStopTimer: jest.fn(),
    onComplete: jest.fn(),
    isCompleteDisabled: false,
  };

  it('終了ボタンが「終了」と表示される', () => {
    render(<TimerBar {...defaultProps} />);
    expect(screen.getByText('終了')).toBeTruthy();
  });

  it('終了ボタンのaccessibilityLabelが「ワークアウトを終了」である', () => {
    render(<TimerBar {...defaultProps} />);
    expect(screen.getByLabelText('ワークアウトを終了')).toBeTruthy();
  });
});

describe('TimerBar - Issue #150: discarded 状態の再生ボタン', () => {
  const discardedProps = {
    timerStatus: 'discarded' as TimerStatus,
    elapsedSeconds: 0,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStopTimer: jest.fn(),
    onComplete: jest.fn(),
    isCompleteDisabled: false,
  };

  it('timerStatus が discarded のとき、再生ボタンが disabled になっている', () => {
    render(<TimerBar {...discardedProps} />);
    // アクセシビリティラベル「開始」のボタンが disabled であることを確認する
    const playButton = screen.getByLabelText('開始');
    // disabled プロパティが true になっているか確認する（Issue #150 修正前は false のままでバグ）
    expect(playButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('timerStatus が not_started のとき、再生ボタンが disabled でない', () => {
    render(<TimerBar {...discardedProps} timerStatus={TimerStatus.NOT_STARTED} />);
    const playButton = screen.getByLabelText('開始');
    // not_started では disabled でないことを確認する
    expect(playButton.props.accessibilityState?.disabled).not.toBe(true);
  });
});
