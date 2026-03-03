/**
 * SettingsScreen テスト
 *
 * T007: 基本レイアウト（セクション存在・準備中バッジ・非活性）
 * T010: 週の目標ステッパー（カウント変更・境界値・Repository呼び出し）
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
});
const mockRunAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('@/database/client', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
  }),
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

// 各テスト前に mockGetFirstAsync をリセット（デフォルト: count=3）
beforeEach(() => {
  mockGetFirstAsync.mockResolvedValue({
    id: 1,
    weekly_goal_count: 3,
  });
  mockRunAsync.mockResolvedValue(undefined);
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

  it('「招待コード」行が表示されないこと', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.queryByText('招待コード')).toBeNull();
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
