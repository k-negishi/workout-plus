/**
 * TimerBar コンポーネントテスト
 *
 * 終了ボタンの文言・アクセシビリティラベルを検証する。
 */
/**
 * TimerBar コンポーネントテスト
 *
 * 終了ボタンの文言・アクセシビリティラベルを検証する。
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
