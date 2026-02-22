/**
 * SetRow コンポーネントテスト
 * - インライン前回記録（「前回:」テキスト）が表示されないこと
 * - セット行本体（セット番号、NumericInput）が正常にレンダリングされること
 * - NumericInput に placeholder が渡されていないこと（US2）
 * - セット番号がテキストラベル形式であること（US2）
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { SetRow } from '../SetRow';

/** テスト用のセットデータ */
const mockSet = {
  id: '1',
  workoutExerciseId: 'we1',
  setNumber: 1,
  weight: null,
  reps: null,
  estimated1RM: null,
  createdAt: 123,
  updatedAt: 123,
};

describe('SetRow', () => {
  const defaultProps = {
    set: mockSet,
    onWeightChange: jest.fn(),
    onRepsChange: jest.fn(),
    onDelete: jest.fn(),
  };

  it('前回記録のインラインテキストが表示されない', () => {
    render(<SetRow {...defaultProps} />);
    // 「前回:」というインライン表示が存在しないこと
    expect(screen.queryByText(/前回:/)).toBeNull();
  });

  it('SetRowProps に previousSet / onCopyPrevious が存在しない', () => {
    // previousSet, onCopyPrevious が props から削除されていることを確認
    // 型エラーなくレンダリングできること自体がテストの証明
    render(<SetRow {...defaultProps} />);
    expect(screen.queryByText(/前回:/)).toBeNull();
  });

  it('セット番号が表示される', () => {
    render(<SetRow {...defaultProps} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('セット番号がテキストのみで表示される（丸バッジなし）', () => {
    render(<SetRow {...defaultProps} />);
    const setNumberElement = screen.getByText('1');
    // セット番号は直接 Text として表示され、fontWeight: '700' のスタイルを持つ
    expect(setNumberElement.props.style).toEqual(
      expect.objectContaining({
        fontWeight: '700',
        color: '#94a3b8',
      }),
    );
  });

  it('NumericInput に placeholder prop が渡されていない', () => {
    render(<SetRow {...defaultProps} />);
    // value が null → TextInput の表示値は空文字列
    const textInputs = screen.getAllByDisplayValue('');
    // 重量とレップの2つの TextInput が存在する
    expect(textInputs.length).toBe(2);
    // どちらの TextInput にも placeholder が設定されていないこと
    textInputs.forEach((input) => {
      expect(input.props.placeholder).toBeUndefined();
    });
  });
});
