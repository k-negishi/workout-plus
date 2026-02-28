/**
 * ExerciseHistoryFullScreen テスト
 * T001: 複数スタック（HomeStack/CalendarStack/RecordStack）での共通利用を検証
 * - 画面レンダリング
 * - 戻るボタン動作
 * - exerciseName の表示
 * - ローディング状態の表示
 * - Issue #142: ヘッダースタイルの統一検証（Ionicons chevron-back）
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

// --- モック定義 ---

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  // route.params に exerciseId/exerciseName を設定
  useRoute: () => ({
    params: { exerciseId: 'ex-1', exerciseName: 'ベンチプレス' },
  }),
}));

// gifted-charts は ESM のみ配布のため jest 環境でパースエラーになる
jest.mock('react-native-gifted-charts', () => ({
  BarChart: 'BarChart',
  LineChart: 'LineChart',
}));

// react-native-svg のモック
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  Polyline: 'Polyline',
}));

// date-fns のモック（タイムゾーン依存を排除）
jest.mock('date-fns', () => ({
  format: (_date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') return '2026-02-22';
    if (formatStr === 'M/d') return '2/22';
    return '2026-02-22';
  },
}));
jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// loading 状態をテストごとに切り替えられるよう変数で管理する
// jest.mock のファクトリはホイストされるため、変数は let で宣言し参照渡しする
let mockLoading = false;
// isCustom をテストごとに差し替え可能にする
let mockIsCustom = false;
// allHistory をテストごとに差し替え可能にする
let mockAllHistory: Array<{
  workoutId: string;
  completedAt: number;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number | null;
    estimated1RM: number | null;
  }>;
  hasPR: boolean;
}> = [];
jest.mock('../../hooks/useExerciseHistory', () => ({
  // 実際の値は mockLoading / mockAllHistory 変数を参照（テスト間で制御可能）
  useExerciseHistory: () => ({
    stats: {
      maxWeight: 100,
      maxVolume: 3000,
      maxReps: 12,
      averageWeight: 80,
      totalSessions: 10,
      totalVolume: 30000,
      lastPRDate: 1700000000000,
      totalSets: 50,
      maxEstimated1RM: 116,
    },
    // Issue #195: weeklyData に maxEstimated1RM を含む
    weeklyData: [],
    prHistory: [],
    get allHistory() {
      return mockAllHistory;
    },
    get loading() {
      return mockLoading;
    },
    get isCustom() {
      return mockIsCustom;
    },
  }),
}));

// ExerciseRepository モック（編集・削除テスト用）
const mockFindById = jest.fn();
const mockSoftDelete = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/database/repositories/exercise', () => ({
  ExerciseRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    softDelete: (...args: unknown[]) => mockSoftDelete(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { ExerciseHistoryFullScreen } from '../ExerciseHistoryFullScreen';

describe('ExerciseHistoryFullScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockFindById.mockClear();
    mockSoftDelete.mockClear();
    mockUpdate.mockClear();
    // 各テスト前にローディング状態と履歴をリセット
    mockLoading = false;
    mockIsCustom = false;
    mockAllHistory = [];
  });

  it('exerciseName がヘッダーに表示される', () => {
    render(<ExerciseHistoryFullScreen />);
    expect(screen.getByText('ベンチプレス')).toBeTruthy();
  });

  it('統計カード（最大重量）が表示される', () => {
    render(<ExerciseHistoryFullScreen />);
    expect(screen.getByText('最高重量')).toBeTruthy();
  });

  describe('Issue #188: 統計カード5項目表示', () => {
    it('最高重量カードが値と単位「kg」付きで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('最高重量')).toBeTruthy();
      // stats.maxWeight = 100
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('最高1RMカードが値と単位「kg」付きで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('最高1RM')).toBeTruthy();
      // stats.maxEstimated1RM = 116 → Math.round(116) = 116
      expect(screen.getByText('116')).toBeTruthy();
    });

    it('最高rep数カードが単位なしで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('最高rep数')).toBeTruthy();
      // stats.maxReps = 12
      expect(screen.getByText('12')).toBeTruthy();
    });

    it('総ワークアウト回数カードが単位なしで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('総ワークアウト回数')).toBeTruthy();
      // stats.totalSessions = 10
      expect(screen.getByText('10')).toBeTruthy();
    });

    it('総セットカードが単位なしで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('総セット')).toBeTruthy();
      // stats.totalSets = 50
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('旧統計項目（最大ボリューム・平均重量）は表示されない', () => {
      render(<ExerciseHistoryFullScreen />);
      expect(screen.queryByText('最大ボリューム')).toBeNull();
      expect(screen.queryByText('平均重量')).toBeNull();
    });

    it('Issue #195: 総ボリュームカードが値と単位「kg」付きで表示される', () => {
      render(<ExerciseHistoryFullScreen />);
      // stats.totalVolume = 30000
      expect(screen.getByText('総ボリューム')).toBeTruthy();
      expect(screen.getByText('30,000')).toBeTruthy();
    });
  });

  it('戻るボタンを押すと goBack() が呼ばれる', () => {
    render(<ExerciseHistoryFullScreen />);
    // Issue #142: accessibilityLabel="戻る" のボタンをタップ
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('Issue #142: ヘッダースタイル統一', () => {
    it('ヘッダーに testID "exercise-history-header" が存在する', () => {
      render(<ExerciseHistoryFullScreen />);

      expect(screen.getByTestId('exercise-history-header')).toBeTruthy();
    });

    it('戻るボタンが accessibilityLabel="戻る" で存在する', () => {
      render(<ExerciseHistoryFullScreen />);

      expect(screen.getByLabelText('戻る')).toBeTruthy();
    });

    it('ヘッダーに種目名タイトルが testID "exercise-history-header-title" で表示される', () => {
      render(<ExerciseHistoryFullScreen />);

      expect(screen.getByTestId('exercise-history-header-title')).toBeTruthy();
    });
  });

  it('loading=true のとき 統計カードが表示されない（ActivityIndicator のみ）', () => {
    mockLoading = true;
    render(<ExerciseHistoryFullScreen />);
    // ローディング中は統計カードが表示されないことを検証
    expect(screen.queryByText('最高重量')).toBeNull();
  });

  describe('日付表示', () => {
    it('日付が「M月D日(曜日)」形式で表示される', () => {
      // 2026-02-18 は水曜日
      mockAllHistory = [
        {
          workoutId: 'w1',
          // 2026-02-18T10:00:00.000Z のタイムスタンプ
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('2月18日(水)')).toBeTruthy();
    });
  });

  describe('Issue #155: カスタム種目の編集・削除UI', () => {
    it('プリセット種目（isCustom=false）は ✎ 🗑 アイコンが表示されない', () => {
      mockIsCustom = false;
      render(<ExerciseHistoryFullScreen />);
      expect(screen.queryByTestId('edit-button')).toBeNull();
      expect(screen.queryByTestId('delete-button')).toBeNull();
    });

    it('カスタム種目（isCustom=true）は ✎ 🗑 アイコンが表示される', () => {
      mockIsCustom = true;
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByTestId('edit-button')).toBeTruthy();
      expect(screen.getByTestId('delete-button')).toBeTruthy();
    });

    it('✎ タップで編集フォームが開く', async () => {
      mockIsCustom = true;
      // findById がフォームの初期値設定に使われる
      mockFindById.mockResolvedValue({
        id: 'ex-1',
        name: 'ベンチプレス',
        muscle_group: 'chest',
        equipment: 'barbell',
        is_custom: 1,
        is_favorite: 0,
        is_deleted: 0,
        created_at: 1000,
        updated_at: 1000,
        sort_order: 1,
      });
      render(<ExerciseHistoryFullScreen />);
      const editBtn = screen.getByTestId('edit-button');
      fireEvent.press(editBtn);
      // フォームが表示されるまで待機
      await screen.findByText('保存');
      expect(screen.getByText('キャンセル')).toBeTruthy();
    });

    it('🗑 タップで Alert.alert が呼ばれる', () => {
      mockIsCustom = true;
      const alertSpy = jest.spyOn(Alert, 'alert');
      render(<ExerciseHistoryFullScreen />);
      const deleteBtn = screen.getByTestId('delete-button');
      fireEvent.press(deleteBtn);
      expect(alertSpy).toHaveBeenCalledWith(
        'ベンチプレスを削除しますか？',
        '削除後も過去のワークアウト記録は残ります。',
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  describe('セット表示デザイン（DaySummary パターン統一）', () => {
    it('セット番号が表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [
            { setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 },
            { setNumber: 2, weight: 85, reps: 8, estimated1RM: 108 },
          ],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      // DaySummary パターンではセット番号が単独テキストで表示される
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('重量と回数が「Nkg x N」形式で表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      // DaySummary パターンでは「80kg × 10」が1つのテキストノード
      expect(screen.getByText('80kg × 10')).toBeTruthy();
    });

    it('1RM換算値が表示される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: 80, reps: 10, estimated1RM: 107 }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.getByText('1RM: 107kg')).toBeTruthy();
    });

    it('1RM が null のセットでは 1RM 表示が省略される', () => {
      mockAllHistory = [
        {
          workoutId: 'w1',
          completedAt: new Date('2026-02-18T10:00:00.000Z').getTime(),
          sets: [{ setNumber: 1, weight: null, reps: 10, estimated1RM: null }],
          hasPR: false,
        },
      ];
      render(<ExerciseHistoryFullScreen />);
      expect(screen.queryByText(/1RM:/)).toBeNull();
    });
  });
});
