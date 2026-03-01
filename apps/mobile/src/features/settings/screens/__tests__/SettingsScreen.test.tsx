/**
 * SettingsScreen テスト
 *
 * T007: 基本レイアウト（セクション存在・準備中バッジ・非活性）
 * T010: 週の目標ステッパー（カウント変更・境界値・Repository呼び出し）
 * T015: 招待コード UI（フォーム展開・有効コード・無効コード・空欄非活性・解禁済みバッジ）
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// useFocusEffect のコールバックを即座に実行してロード済み状態でテスト
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn().mockImplementation((callback: () => unknown) => {
    callback();
  }),
}));

// expo-constants モック（バージョン表示用）
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0' },
  },
}));

// UserSettingsRepository が呼ぶ getDatabase をモック
const mockGetFirstAsync = jest.fn().mockResolvedValue({
  id: 1,
  weekly_goal_count: 3,
  invite_code_unlocked: 0,
});
const mockRunAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
  }),
}));

// validateInviteCode をモック（T015 で上書き可能にする）
const mockValidateInviteCode = jest.fn().mockReturnValue(false);

jest.mock('../../utils/inviteCode', () => ({
  validateInviteCode: (...args: unknown[]) => mockValidateInviteCode(...args),
}));

// react-native-safe-area-context モック
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react');
  return {
    useSafeAreaInsets: jest.fn().mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: ({ children }: { children: unknown }) =>
      RN.createElement(RN.Fragment, null, children),
  };
});

import { SettingsScreen } from '../SettingsScreen';

// 各テスト前に mockGetFirstAsync をリセット（デフォルト: count=3, unlocked=false）
beforeEach(() => {
  mockGetFirstAsync.mockResolvedValue({
    id: 1,
    weekly_goal_count: 3,
    invite_code_unlocked: 0,
  });
  mockRunAsync.mockResolvedValue(undefined);
  mockValidateInviteCode.mockReturnValue(false);
});

// ---- T007: 基本レイアウト -----------------------------------------------

describe('SettingsScreen 基本レイアウト', () => {
  it('「ワークアウト」セクションタイトルが表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('ワークアウト')).toBeTruthy();
    });
  });

  it('「週の目標」ラベルが表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('週の目標')).toBeTruthy();
    });
  });

  it('「招待コード」行が表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('招待コード')).toBeTruthy();
    });
  });

  it('「データ管理」セクションタイトルが表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('データ管理')).toBeTruthy();
    });
  });

  it('「データインポート」行が準備中バッジとともに表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('データインポート')).toBeTruthy();
    });
  });

  it('「データエクスポート」行が準備中バッジとともに表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('データエクスポート')).toBeTruthy();
    });
  });

  it('「その他」セクションタイトルが表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('その他')).toBeTruthy();
    });
  });

  it('「利用規約」行が準備中バッジとともに表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('利用規約')).toBeTruthy();
    });
  });

  it('「プライバシーポリシー」行が準備中バッジとともに表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('プライバシーポリシー')).toBeTruthy();
    });
  });

  it('バージョン情報が表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('v1.0.0')).toBeTruthy();
    });
  });
});

// ---- T010: 週の目標ステッパー -------------------------------------------

describe('SettingsScreen 週の目標ステッパー', () => {
  it('初期値が「3回」で表示されること', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('stepper-count')).toBeTruthy();
      expect(screen.getByText('3回')).toBeTruthy();
    });
  });

  it('[+] ボタンタップで回数が増加すること', async () => {
    render(<SettingsScreen />);
    await screen.findByTestId('stepper-increment');
    fireEvent.press(screen.getByTestId('stepper-increment'));
    await waitFor(() => {
      expect(screen.getByText('4回')).toBeTruthy();
    });
  });

  it('[−] ボタンタップで回数が減少すること', async () => {
    render(<SettingsScreen />);
    await screen.findByTestId('stepper-increment');
    // 先に +1 して 4 にしてから -1 して 3 に戻す
    fireEvent.press(screen.getByTestId('stepper-increment'));
    await screen.findByText('4回');
    fireEvent.press(screen.getByTestId('stepper-decrement'));
    await waitFor(() => {
      expect(screen.getByText('3回')).toBeTruthy();
    });
  });

  it('回数が 1 のとき [−] ボタンが非活性であること', async () => {
    // count=1 の初期状態をセット
    mockGetFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 1,
      invite_code_unlocked: 0,
    });
    render(<SettingsScreen />);
    await screen.findByText('1回');
    const decrementBtn = screen.getByTestId('stepper-decrement');
    expect(decrementBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('回数が 7 のとき [+] ボタンが非活性であること', async () => {
    mockGetFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 7,
      invite_code_unlocked: 0,
    });
    render(<SettingsScreen />);
    await screen.findByText('7回');
    const incrementBtn = screen.getByTestId('stepper-increment');
    expect(incrementBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('[+] タップで UserSettingsRepository.setWeeklyGoalCount が呼ばれること', async () => {
    render(<SettingsScreen />);
    await screen.findByTestId('stepper-increment');
    fireEvent.press(screen.getByTestId('stepper-increment'));
    await waitFor(() => {
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE user_settings SET weekly_goal_count/i),
        [4],
      );
    });
  });
});

// ---- T015: 招待コード UI ------------------------------------------------

describe('SettingsScreen 招待コード UI', () => {
  it('未解禁時、招待コード行をタップするとフォームが展開されること', async () => {
    render(<SettingsScreen />);
    await screen.findByTestId('invite-code-row');
    fireEvent.press(screen.getByTestId('invite-code-row'));
    await waitFor(() => {
      expect(screen.getByTestId('invite-code-form')).toBeTruthy();
    });
  });

  it('入力が空のとき「適用」ボタンが非活性であること', async () => {
    render(<SettingsScreen />);
    await screen.findByTestId('invite-code-row');
    fireEvent.press(screen.getByTestId('invite-code-row'));
    await screen.findByTestId('invite-code-apply-button');
    const applyBtn = screen.getByTestId('invite-code-apply-button');
    expect(applyBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('無効コード入力時、エラーテキストが表示されること', async () => {
    mockValidateInviteCode.mockReturnValue(false);
    render(<SettingsScreen />);
    await screen.findByTestId('invite-code-row');
    fireEvent.press(screen.getByTestId('invite-code-row'));
    await screen.findByTestId('invite-code-input');
    fireEvent.changeText(screen.getByTestId('invite-code-input'), 'wrong-code');
    fireEvent.press(screen.getByTestId('invite-code-apply-button'));
    await waitFor(() => {
      expect(screen.getByText('コードが正しくありません')).toBeTruthy();
    });
  });

  it('有効コード適用時、成功テキストが表示されること', async () => {
    mockValidateInviteCode.mockReturnValue(true);
    render(<SettingsScreen />);
    await screen.findByTestId('invite-code-row');
    fireEvent.press(screen.getByTestId('invite-code-row'));
    await screen.findByTestId('invite-code-input');
    fireEvent.changeText(screen.getByTestId('invite-code-input'), 'valid-code');
    fireEvent.press(screen.getByTestId('invite-code-apply-button'));
    await waitFor(() => {
      expect(screen.getByText('✓ 限定機能が解禁されました')).toBeTruthy();
    });
  });

  it('解禁済みのとき「解禁済み」バッジが表示されること', async () => {
    mockGetFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 3,
      invite_code_unlocked: 1,
    });
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('解禁済み')).toBeTruthy();
    });
  });

  it('解禁済みのとき招待コードフォームが表示されないこと', async () => {
    mockGetFirstAsync.mockResolvedValue({
      id: 1,
      weekly_goal_count: 3,
      invite_code_unlocked: 1,
    });
    render(<SettingsScreen />);
    await screen.findByText('解禁済み');
    expect(screen.queryByTestId('invite-code-form')).toBeNull();
  });
});
