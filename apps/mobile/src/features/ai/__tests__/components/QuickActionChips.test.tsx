/**
 * QuickActionChips コンポーネントテスト
 *
 * - actions のラベルがチップとして表示されること
 * - タップ時に onPress が呼ばれること
 * - disabled 時にグレーアウトされ、タップが無効になること
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { QuickActionChips } from '../../components/QuickActionChips';
import type { QuickAction } from '../../types/index';

/** テスト用クイックアクション */
const testActions: QuickAction[] = [
  { id: 'action-1', label: '今回を振り返る', prompt: '振り返りのプロンプト' },
  { id: 'action-2', label: '次を提案して', prompt: '提案のプロンプト' },
];

describe('QuickActionChips', () => {
  it('各アクションのラベルが表示されること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={false} />);
    expect(screen.getByText('今回を振り返る')).toBeTruthy();
    expect(screen.getByText('次を提案して')).toBeTruthy();
  });

  it('チップをタップすると onPress が対応する action で呼ばれること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={false} />);
    fireEvent.press(screen.getByText('今回を振り返る'));
    expect(onPress).toHaveBeenCalledWith(testActions[0]);
  });

  it('disabled=false 時に青色スタイル（#E6F2FF背景）が適用されること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={false} />);
    const chip = screen.getByTestId('quick-action-chip-action-1');
    const flatStyle = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style)
      : chip.props.style;
    expect(flatStyle.backgroundColor).toBe('#E6F2FF');
  });

  it('disabled=false 時にテキストが#4D94FFで表示されること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={false} />);
    const label = screen.getByTestId('quick-action-label-action-1');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#4D94FF');
  });

  it('disabled=true 時にグレー背景（#F1F5F9）が適用されること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={true} />);
    const chip = screen.getByTestId('quick-action-chip-action-1');
    const flatStyle = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style)
      : chip.props.style;
    expect(flatStyle.backgroundColor).toBe('#F1F5F9');
  });

  it('disabled=true 時にテキストが#94A3B8でグレーアウトされること', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={true} />);
    const label = screen.getByTestId('quick-action-label-action-1');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#94A3B8');
  });

  it('disabled=true 時にタップしても onPress が呼ばれないこと', () => {
    const onPress = jest.fn();
    render(<QuickActionChips actions={testActions} onPress={onPress} disabled={true} />);
    fireEvent.press(screen.getByText('今回を振り返る'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('アクションが空の場合にクラッシュしないこと', () => {
    const onPress = jest.fn();
    expect(() =>
      render(<QuickActionChips actions={[]} onPress={onPress} disabled={false} />),
    ).not.toThrow();
  });
});
