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

  // ────────────────────────────────────────────────────────────
  // IME フィルタリング（Issue #165: iOS 日本語入力対応）
  // ────────────────────────────────────────────────────────────

  it('重量フィールドに日本語文字 "あ" を入力しても onWeightChange は呼ばれないこと（空文字扱い）', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    // 日本語 IME が数字なしの文字列を onChangeText に渡した場合
    fireEvent.changeText(weightInput, 'あ');
    // 数値が取れないため onWeightChange(id, null) が呼ばれる
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', null);
  });

  it('重量フィールドに "1あ0" を入力すると数値部分 10 が親に通知されること', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    // 日本語 IME が数字と日本語文字を混在させた場合（例: IME が割り込む）
    fireEvent.changeText(weightInput, '1あ0');
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', 10);
  });

  it('重量フィールドに "6..5" を入力すると小数点重複が除去されて 6.5 が親に通知されること', () => {
    render(<SetRow {...defaultProps} />);
    const weightInput = screen.getByTestId('weight-input');
    fireEvent.changeText(weightInput, '6..5');
    expect(defaultProps.onWeightChange).toHaveBeenCalledWith('1', 6.5);
  });

  it('レップフィールドに "1あ0" を入力すると数値部分 10 が親に通知されること', () => {
    render(<SetRow {...defaultProps} />);
    const repsInput = screen.getByTestId('reps-input');
    fireEvent.changeText(repsInput, '1あ0');
    expect(defaultProps.onRepsChange).toHaveBeenCalledWith('1', 10);
  });

  // ────────────────────────────────────────────────────────────
  // Issue #190: 右スペース解消 - レイアウト修正
  // ────────────────────────────────────────────────────────────

  it('セット番号テキストが textAlign: center であること（ヘッダー "Set" と中央揃えを統一）', () => {
    render(<SetRow {...defaultProps} />);
    // setNumber=1 → "1" テキスト
    const setNumberText = screen.getByText('1');
    expect(setNumberText.props.style).toMatchObject({ textAlign: 'center' });
  });

  it('"x" 区切り文字に width: 16 が設定されていること（カラムヘッダースペーサーと幅一致）', () => {
    render(<SetRow {...defaultProps} />);
    const xText = screen.getByText('x');
    expect(xText.props.style).toMatchObject({ width: 16 });
  });

  it('1RM テキストに width: 48 が設定されていること（コンパクト固定幅）', () => {
    render(<SetRow {...defaultProps} />);
    // weight=null のとき 1RM 表示は "-"
    const rmText = screen.getByText('-');
    expect(rmText.props.style).toMatchObject({ width: 48 });
  });

  it('削除ボタンが flex: 1 を持ち右スペースを吸収すること', () => {
    render(<SetRow {...defaultProps} />);
    const deleteButton = screen.getByLabelText('セット1を削除');
    expect(deleteButton.props.style).toMatchObject({ flex: 1 });
  });

  // ────────────────────────────────────────────────────────────
  // onBlur 正規化（Issue #165: フォーカス離脱時の表示リセット）
  // ────────────────────────────────────────────────────────────

  it('重量フィールドの onBlur 後、表示値が親の set.weight (100) に戻ること', () => {
    render(<SetRow {...defaultProps} set={mockSetFilled} />);
    const weightInput = screen.getByTestId('weight-input');
    // 途中まで入力した後にフォーカスを外す
    fireEvent.changeText(weightInput, '9');
    fireEvent(weightInput, 'blur');
    // 親の set.weight = 100 に戻る
    expect(weightInput.props.value).toBe('100');
  });

  it('レップフィールドの onBlur 後、表示値が親の set.reps (5) に戻ること', () => {
    render(<SetRow {...defaultProps} set={mockSetFilled} />);
    const repsInput = screen.getByTestId('reps-input');
    fireEvent.changeText(repsInput, '2');
    fireEvent(repsInput, 'blur');
    expect(repsInput.props.value).toBe('5');
  });
});
