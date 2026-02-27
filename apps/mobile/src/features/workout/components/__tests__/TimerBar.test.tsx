/**
 * TimerBar コンポーネントテスト
 *
 * 終了ボタンの文言・アクセシビリティラベル・
 * discarded 状態での再生ボタン・手入力機能を検証する。
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
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
    onResetAndStart: jest.fn(),
    onStopTimer: jest.fn(),
    onComplete: jest.fn(),
    onManualTimeSet: jest.fn(),
    isCompleteDisabled: false,
  };

  it('完了ボタンが「完了」と表示される', () => {
    render(<TimerBar {...defaultProps} />);
    expect(screen.getByText('完了')).toBeTruthy();
  });

  it('完了ボタンのaccessibilityLabelが「ワークアウトを完了」である', () => {
    render(<TimerBar {...defaultProps} />);
    expect(screen.getByLabelText('ワークアウトを完了')).toBeTruthy();
  });
});

describe('TimerBar - Issue #175: discarded 状態の再生ボタン', () => {
  const mockResetAndStart = jest.fn();

  const discardedProps = {
    timerStatus: 'discarded' as TimerStatus,
    elapsedSeconds: 0,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onResetAndStart: mockResetAndStart,
    onStopTimer: jest.fn(),
    onComplete: jest.fn(),
    onManualTimeSet: jest.fn(),
    isCompleteDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('timerStatus が discarded のとき、再生ボタンが disabled でない（再開可能）', () => {
    render(<TimerBar {...discardedProps} />);
    const playButton = screen.getByLabelText('開始');
    // Issue #175: discarded でも再開できるように disabled を外す
    expect(playButton.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('timerStatus が discarded のとき、再生ボタン押下で onResetAndStart が呼ばれる', () => {
    render(<TimerBar {...discardedProps} />);
    const playButton = screen.getByLabelText('開始');
    fireEvent.press(playButton);
    expect(mockResetAndStart).toHaveBeenCalledTimes(1);
  });

  it('timerStatus が not_started のとき、再生ボタンが disabled でない', () => {
    render(<TimerBar {...discardedProps} timerStatus={TimerStatus.NOT_STARTED} />);
    const playButton = screen.getByLabelText('開始');
    expect(playButton.props.accessibilityState?.disabled).not.toBe(true);
  });
});

describe('TimerBar - Issue #175: 手入力機能', () => {
  const mockManualTimeSet = jest.fn();

  const pausedProps = {
    timerStatus: 'paused' as TimerStatus,
    elapsedSeconds: 90,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onResetAndStart: jest.fn(),
    onStopTimer: jest.fn(),
    onComplete: jest.fn(),
    onManualTimeSet: mockManualTimeSet,
    isCompleteDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paused 状態で経過時間をタップすると手入力モードになる', () => {
    render(<TimerBar {...pausedProps} />);
    // 経過時間の表示テキストをタップ
    fireEvent.press(screen.getByLabelText('経過時間を編集'));
    // TextInput が表示される
    expect(screen.getByLabelText('経過時間の手入力')).toBeTruthy();
  });

  it('discarded 状態で経過時間をタップすると手入力モードになる', () => {
    render(<TimerBar {...pausedProps} timerStatus="discarded" elapsedSeconds={0} />);
    fireEvent.press(screen.getByLabelText('経過時間を編集'));
    expect(screen.getByLabelText('経過時間の手入力')).toBeTruthy();
  });

  it('running 状態では経過時間をタップしても手入力モードにならない', () => {
    render(<TimerBar {...pausedProps} timerStatus="running" />);
    // running 時は編集ボタンが存在しない
    expect(screen.queryByLabelText('経過時間を編集')).toBeNull();
  });

  it('手入力で MM:SS 形式の値を入力し確定すると onManualTimeSet が呼ばれる', () => {
    render(<TimerBar {...pausedProps} />);
    // 手入力モードに切り替え
    fireEvent.press(screen.getByLabelText('経過時間を編集'));
    const input = screen.getByLabelText('経過時間の手入力');
    // 5:30 を入力
    fireEvent.changeText(input, '5:30');
    fireEvent(input, 'submitEditing');
    // 5分30秒 = 330秒
    expect(mockManualTimeSet).toHaveBeenCalledWith(330);
  });

  it('手入力で HH:MM:SS 形式の値を入力し確定すると onManualTimeSet が呼ばれる', () => {
    render(<TimerBar {...pausedProps} />);
    fireEvent.press(screen.getByLabelText('経過時間を編集'));
    const input = screen.getByLabelText('経過時間の手入力');
    // 1:05:30 を入力
    fireEvent.changeText(input, '1:05:30');
    fireEvent(input, 'submitEditing');
    // 1時間5分30秒 = 3930秒
    expect(mockManualTimeSet).toHaveBeenCalledWith(3930);
  });
});
