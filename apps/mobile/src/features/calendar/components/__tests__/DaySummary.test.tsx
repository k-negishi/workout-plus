/**
 * DaySummary コンポーネントのテスト
 *
 * 種目名タップ → ExerciseHistory 遷移のコールバック呼び出しを検証する。
 * 削除ボタン（T4）、日付ヘッダー非タップ化（T5）のテストも含む。
 *
 * expo-sqlite の getDatabase をモックし、テスト用データを返すようにする。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// ==========================================
// react-native-svg モック（CheckIcon で使用）
// jest.requireActual で react-native の View を取得する
// ==========================================
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Svg: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    Path: () => null,
    Polyline: () => null,
  };
});

// ==========================================
// expo-sqlite / database/client モック
// jest.mock のファクトリー関数は hoisting されるため、モジュールスコープの
// jest.fn() 変数を直接参照できない。そのため getDatabase が返す db オブジェクトの
// メソッドを、後から差し替え可能なコンテナ経由で呼び出す。
// ==========================================
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock('@/database/client', () => ({
  getDatabase: () =>
    Promise.resolve({
      // ファクトリー外で定義した mockGetAllAsync/mockGetFirstAsync を
      // ラッパー経由で呼び出すことで、各テストの mockImplementation が有効になる
      getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
      getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    }),
}));

import { DaySummary } from '../DaySummary';

describe('DaySummary - 種目名タップ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ワークアウトデータがある日付のモックデータをセットアップする
   */
  const setupMockWithWorkout = () => {
    // workouts クエリ: 完了済みワークアウトを 1 件返す
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
          },
        ]);
      }
      // workout_exercises クエリ
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([
          { id: 'we-1', workout_id: 'workout-1', exercise_id: 'ex-bench', display_order: 1 },
          { id: 'we-2', workout_id: 'workout-1', exercise_id: 'ex-squat', display_order: 2 },
        ]);
      }
      // sets クエリ
      if (sql.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's-1',
            workout_exercise_id: 'we-1',
            set_number: 1,
            weight: 100,
            reps: 10,
            estimated_1rm: 133,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    // exercises クエリ: 種目名を返す
    mockGetFirstAsync.mockImplementation((_sql: string, params: unknown[]) => {
      if (params[0] === 'ex-bench') {
        return Promise.resolve({ id: 'ex-bench', name: 'ベンチプレス' });
      }
      if (params[0] === 'ex-squat') {
        return Promise.resolve({ id: 'ex-squat', name: 'スクワット' });
      }
      return Promise.resolve(null);
    });
  };

  it('種目名をタップすると onNavigateToExerciseHistory が exerciseId と exerciseName で呼ばれる', async () => {
    // Given: モックデータ設定
    setupMockWithWorkout();
    const mockOnNavigate = jest.fn();

    render(<DaySummary dateString="2026-02-01" onNavigateToExerciseHistory={mockOnNavigate} />);

    // When: データ読み込みが完了するまで待機
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // When: 種目名をタップ
    fireEvent.press(screen.getByText('ベンチプレス'));

    // Then: コールバックが正しい引数で呼ばれる
    expect(mockOnNavigate).toHaveBeenCalledWith('ex-bench', 'ベンチプレス');
    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  it('別の種目名をタップすると正しい exerciseId で呼ばれる', async () => {
    // Given
    setupMockWithWorkout();
    const mockOnNavigate = jest.fn();

    render(<DaySummary dateString="2026-02-01" onNavigateToExerciseHistory={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('スクワット')).toBeTruthy();
    });

    // When: スクワットをタップ
    fireEvent.press(screen.getByText('スクワット'));

    // Then: スクワットの exerciseId で呼ばれる
    expect(mockOnNavigate).toHaveBeenCalledWith('ex-squat', 'スクワット');
  });

  it('種目名が青文字（#4D94FF）で表示される', async () => {
    // Given
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: 種目名テキストの color が #4D94FF
    const exerciseText = screen.getByText('ベンチプレス');
    expect(exerciseText.props.style).toMatchObject({ color: '#4D94FF' });
  });

  it('onNavigateToExerciseHistory が未指定の場合でも種目名タップでクラッシュしない', async () => {
    // Given: コールバックなし（オプショナル prop）
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // When: タップしてもエラーが起きないこと
    expect(() => {
      fireEvent.press(screen.getByText('ベンチプレス'));
    }).not.toThrow();
  });
});

// ==========================================
// T4: 削除ボタンのテスト
// ==========================================
describe('DaySummary - 削除ボタン', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ワークアウトデータがある日付のモックデータをセットアップする
   */
  const setupMockWithWorkout = () => {
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-delete-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
          },
        ]);
      }
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([
          { id: 'we-1', workout_id: 'workout-delete-1', exercise_id: 'ex-bench', display_order: 1 },
        ]);
      }
      if (sql.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's-1',
            workout_exercise_id: 'we-1',
            set_number: 1,
            weight: 80,
            reps: 8,
            estimated_1rm: 100,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    mockGetFirstAsync.mockImplementation((_sql: string, params: unknown[]) => {
      if (params[0] === 'ex-bench') {
        return Promise.resolve({ id: 'ex-bench', name: 'ベンチプレス' });
      }
      return Promise.resolve(null);
    });
  };

  /**
   * ワークアウトがない日付のモックデータをセットアップする
   */
  const setupMockWithNoWorkout = () => {
    mockGetAllAsync.mockResolvedValue([]);
    mockGetFirstAsync.mockResolvedValue(null);
  };

  it('ワークアウトがある場合に onWorkoutFound が workoutId 付きで呼ばれる', async () => {
    // Given: ワークアウトデータあり・onWorkoutFound コールバックを渡す
    setupMockWithWorkout();
    const mockOnWorkoutFound = jest.fn();

    render(<DaySummary dateString="2026-02-01" onWorkoutFound={mockOnWorkoutFound} />);

    // When: データ読み込みが完了するまで待機
    await waitFor(() => {
      expect(mockOnWorkoutFound).toHaveBeenCalledWith('workout-delete-1');
    });
  });

  it('ワークアウトがない場合に onWorkoutFound が null で呼ばれる', async () => {
    // Given: ワークアウトデータなし
    setupMockWithNoWorkout();
    const mockOnWorkoutFound = jest.fn();

    render(<DaySummary dateString="2026-02-01" onWorkoutFound={mockOnWorkoutFound} />);

    // When: データ読み込みが完了するまで待機
    await waitFor(() => {
      expect(mockOnWorkoutFound).toHaveBeenCalledWith(null);
    });
  });
});

// ==========================================
// T5: 日付ヘッダーのタップ遷移除去テスト
// ==========================================
describe('DaySummary - 日付ヘッダー（T5: タップ遷移なし）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockWithWorkout = () => {
    // ワークアウトあり（日付ヘッダーが表示されるケース）
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-header-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
          },
        ]);
      }
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    mockGetFirstAsync.mockResolvedValue(null);
  };

  it('日付ヘッダーに ChevronRight アイコンが表示されない', async () => {
    // Given: ワークアウトありのモックデータ
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了まで待機
    await waitFor(() => {
      expect(screen.getByText('2026年2月1日（日）のワークアウト')).toBeTruthy();
    });

    // Then: ChevronRight アイコン（testID）は存在しない
    expect(screen.queryByTestId('header-chevron-right')).toBeNull();
  });

  it('日付ヘッダーが Pressable ではなく View としてレンダリングされる（onPress なし）', async () => {
    // Given: ワークアウトありのモックデータ
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了まで待機
    await waitFor(() => {
      expect(screen.getByText('2026年2月1日（日）のワークアウト')).toBeTruthy();
    });

    // Then: 日付ヘッダーコンテナに onPress prop がない（Pressable でない）
    const headerView = screen.getByTestId('date-header');
    expect(headerView.props.onPress).toBeUndefined();
  });
});

// ==========================================
// Issue #133: set 文言追加のテスト
// ==========================================
describe('DaySummary - set 文言追加', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockWithWorkout = () => {
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-set-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
            memo: null,
          },
        ]);
      }
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([
          {
            id: 'we-1',
            workout_id: 'workout-set-1',
            exercise_id: 'ex-bench',
            display_order: 1,
            memo: null,
          },
        ]);
      }
      if (sql.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's-1',
            workout_exercise_id: 'we-1',
            set_number: 1,
            weight: 100,
            reps: 10,
            estimated_1rm: 133,
          },
          {
            id: 's-2',
            workout_exercise_id: 'we-1',
            set_number: 2,
            weight: 100,
            reps: 8,
            estimated_1rm: 127,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    mockGetFirstAsync.mockImplementation((_sql: string, params: unknown[]) => {
      if (params[0] === 'ex-bench') {
        return Promise.resolve({ id: 'ex-bench', name: 'ベンチプレス' });
      }
      return Promise.resolve(null);
    });
  };

  it('セット行にセット番号と "set" 文言が表示される', async () => {
    // Given: ワークアウトデータあり
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: "1 set" が表示される（セット行）
    expect(screen.getByText('1 set')).toBeTruthy();
    // "2 set" はサマリーカード（totalSets）とセット行（set_number 2）の両方に表示されるため getAllByText で検証
    expect(screen.getAllByText('2 set').length).toBeGreaterThanOrEqual(1);
  });

  it('サマリーカードのセット数に "set" 文言が表示される', async () => {
    // Given: ワークアウトデータあり（2セット）
    setupMockWithWorkout();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: サマリーカードに「セット数」ラベルが表示され、"2 set" テキストが存在する
    expect(screen.getByText('セット数')).toBeTruthy();
    // "2 set" はサマリーカードとセット行の両方に存在するため getAllByText で検証
    expect(screen.getAllByText('2 set').length).toBe(2);
  });
});

// ==========================================
// Issue #133: メモ表示のテスト
// ==========================================
describe('DaySummary - メモ表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ワークアウトメモ・種目メモを含むモックデータ
   */
  const setupMockWithMemos = () => {
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-memo-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
            memo: '今日は調子が良かった',
          },
        ]);
      }
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([
          {
            id: 'we-1',
            workout_id: 'workout-memo-1',
            exercise_id: 'ex-bench',
            display_order: 1,
            memo: 'グリップ幅を少し広めに',
          },
        ]);
      }
      if (sql.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's-1',
            workout_exercise_id: 'we-1',
            set_number: 1,
            weight: 100,
            reps: 10,
            estimated_1rm: 133,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    mockGetFirstAsync.mockImplementation((_sql: string, params: unknown[]) => {
      if (params[0] === 'ex-bench') {
        return Promise.resolve({ id: 'ex-bench', name: 'ベンチプレス' });
      }
      return Promise.resolve(null);
    });
  };

  /**
   * メモがないモックデータ
   */
  const setupMockWithoutMemos = () => {
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM workouts')) {
        return Promise.resolve([
          {
            id: 'workout-nomemo-1',
            status: 'completed',
            completed_at: new Date('2026-02-01T10:00:00.000Z').getTime(),
            elapsed_seconds: 3600,
            timer_status: 'stopped',
            memo: null,
          },
        ]);
      }
      if (sql.includes('FROM workout_exercises')) {
        return Promise.resolve([
          {
            id: 'we-1',
            workout_id: 'workout-nomemo-1',
            exercise_id: 'ex-bench',
            display_order: 1,
            memo: null,
          },
        ]);
      }
      if (sql.includes('FROM sets')) {
        return Promise.resolve([
          {
            id: 's-1',
            workout_exercise_id: 'we-1',
            set_number: 1,
            weight: 100,
            reps: 10,
            estimated_1rm: 133,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    mockGetFirstAsync.mockImplementation((_sql: string, params: unknown[]) => {
      if (params[0] === 'ex-bench') {
        return Promise.resolve({ id: 'ex-bench', name: 'ベンチプレス' });
      }
      return Promise.resolve(null);
    });
  };

  it('ワークアウトメモが存在する場合に表示される', async () => {
    // Given: メモ付きワークアウトデータ
    setupMockWithMemos();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: ワークアウトメモが表示される
    expect(screen.getByText('今日は調子が良かった')).toBeTruthy();
  });

  it('種目メモが存在する場合に種目カード内に表示される', async () => {
    // Given: 種目メモ付きデータ
    setupMockWithMemos();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: 種目メモが表示される
    expect(screen.getByText('グリップ幅を少し広めに')).toBeTruthy();
  });

  it('メモがない場合はメモ領域が表示されない', async () => {
    // Given: メモなしデータ
    setupMockWithoutMemos();

    render(<DaySummary dateString="2026-02-01" />);

    // When: データ読み込み完了
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeTruthy();
    });

    // Then: ワークアウトメモの testID が存在しない
    expect(screen.queryByTestId('workout-memo')).toBeNull();
    // Then: 種目メモの testID が存在しない
    expect(screen.queryByTestId('exercise-memo-we-1')).toBeNull();
  });
});
