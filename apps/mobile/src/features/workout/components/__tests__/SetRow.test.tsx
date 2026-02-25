/**
 * SetRow コンポーネントテスト（Issue #121: NumericInput → TextInput 化）
 *
 * TextInput を使った軽量デザインへの変更に伴い、
 * 旧テスト（NumericInput 前提）を全面刷新する。
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SetRow } from '../SetRow';

/** テスト用のセットデータ（weight/reps null = 未入力状態） */
const mockSetEmpty = {
  id: '1',
  workoutExerciseId: 'we1',
  setNumber: 1,
  weight: null,
  reps: null,
  estimated1RM: null,
  createdAt: 123,
  updatedAt: 123,
};

/** テスト用のセットデータ（重量・レップ入力済み → 1RM 計算可能） */
const mockSetFilled = {
  id: '2',
  workoutExerciseId: 'we1',
  setNumber: 2,
  // 100kg × 5reps → Epley 式: 100 * (1 + 5/30) ≈ 117
  weight: 100,
  reps: 5,
  estimated1RM: null,
  createdAt: 123,
  updatedAt: 123,
};

describe('SetRow', () => {
  const defaultProps = {
    set: mockSetEmpty,
    onWeightChange: jest.fn(),
    onRepsChange: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // レイアウト: 枠線なし（borderless 確認）
  // ────────────────────────────────────────────────────────────

  it('行コンテナに borderWidth が存在しないこと（枠線なしデザイン）', () => {
    const { UNSAFE_getAllByType } = render(<SetRow {...defaultProps} />);
    // jest.requireActual で react-native の View を取得（require() スタイル禁止のための代替手段）
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    const allViews = UNSAFE_getAllByType(View);
    // 最初の View が行コンテナ。borderWidth を持たないことを確認する
    // （TextInput の入力枠と行全体の枠線を混同しないための検証）
    const containerStyle = allViews[0].props.style as Record<string, unknown> | undefined;
    // TS4111: index signature プロパティは ['key'] 形式でアクセスする必要がある
    expect(containerStyle?.['borderWidth']).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────
  // 行間スペーシング（Issue #128）
  // ────────────────────────────────────────────────────────────

  it('外枠 View に paddingVertical: 4 が設定されていること（Issue #128 行間拡大）', () => {
    render(<SetRow {...defaultProps} />);
    // testID="set-row-container" で外枠 View を特定して垂直パディングを検証する
    const container = screen.getByTestId('set-row-container');
    expect(container.props.style).toMatchObject({ paddingVertical: 4 });
  });

  // ────────────────────────────────────────────────────────────
  // placeholder が存在しないこと（Issue #146: プレースホルダー削除）
  // ────────────────────────────────────────────────────────────

  it('重量入力フィールドに placeholder が設定されていないこと', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    // placeholder が undefined または空文字であることを確認する
    expect(weightInput.props.placeholder).toBeFalsy();
  });

  it('rep入力フィールドに placeholder が設定されていないこと', () => {
    render(<SetRow {...defaultProps} />);
    const repsInput = screen.getByTestId('reps-input');
    // placeholder が undefined または空文字であることを確認する
    expect(repsInput.props.placeholder).toBeFalsy();
  });

  // ────────────────────────────────────────────────────────────
  // 重量フィールド: keyboardType
  // ────────────────────────────────────────────────────────────

  it('重量入力フィールドが decimal-pad キーボードを持つこと', () => {
    render(<SetRow {...defaultProps} />);
    // testID で重量フィールドを特定する
    const weightInput = screen.getByTestId('weight-input');
    expect(weightInput.props.keyboardType).toBe('decimal-pad');
  });

  // ────────────────────────────────────────────────────────────
  // レップフィールド: keyboardType
  // ────────────────────────────────────────────────────────────

  it('レップ入力フィールドが number-pad キーボードを持つこと', () => {
    render(<SetRow {...defaultProps} />);
    // testID でレップフィールドを特定する
    const repsInput = screen.getByTestId('reps-input');
    expect(repsInput.props.keyboardType).toBe('number-pad');
  });

  // ────────────────────────────────────────────────────────────
  // 1RM 表示: 未計算（null）のとき "-" を表示
  // ────────────────────────────────────────────────────────────

  it('weight/reps が null のとき 1RM セルに "-" が表示されること', () => {
    render(<SetRow {...defaultProps} />);
    // 1RM 未計算時は "-" というテキストが表示される（prefix "1RM " なし）
    expect(screen.getByText('-')).toBeTruthy();
  });

  // ────────────────────────────────────────────────────────────
  // 1RM 表示: 計算済みのとき数値を表示
  // ────────────────────────────────────────────────────────────

  it('weight=100 reps=5 のとき推定1RM が数値で表示されること', () => {
    render(<SetRow {...defaultProps} set={mockSetFilled} />);
    // Epley 式: 100 * (1 + 5/30) ≈ 117（四捨五入）
    // "1RM " prefix なしの純粋な数値文字列
    expect(screen.getByText('117')).toBeTruthy();
    // "1RM xxx" 形式のテキストが存在しないこと（旧仕様の確認）
    expect(screen.queryByText(/^1RM /)).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  // 削除ボタン
  // ────────────────────────────────────────────────────────────

  it('削除ボタンをタップすると onDelete が set.id を引数に呼ばれること', () => {
    render(<SetRow {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('セット1を削除'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────────
  // 重量変更コールバック
  // ────────────────────────────────────────────────────────────

  it('重量フィールドに "60.5" を入力すると onWeightChange(setId, 60.5) が呼ばれること', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    fireEvent.changeText(weightInput, '60.5');
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', 60.5);
  });

  it('重量フィールドに空文字を入力すると onWeightChange(setId, null) が呼ばれること', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    fireEvent.changeText(weightInput, '');
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', null);
  });

  it('重量フィールドに "-" を入力すると onWeightChange(setId, null) が呼ばれること', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    fireEvent.changeText(weightInput, '-');
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', null);
  });

  // ────────────────────────────────────────────────────────────
  // レップ変更コールバック
  // ────────────────────────────────────────────────────────────

  it('レップフィールドに "10" を入力すると onRepsChange(setId, 10) が呼ばれること', () => {
    render(<SetRow {...defaultProps} />);
    const repsInput = screen.getByTestId('reps-input');
    fireEvent.changeText(repsInput, '10');
    expect(defaultProps.onRepsChange).toHaveBeenCalledWith('1', 10);
  });
});
