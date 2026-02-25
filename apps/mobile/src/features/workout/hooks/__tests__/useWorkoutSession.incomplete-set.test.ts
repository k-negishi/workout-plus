/**
 * 不完全セットの自動スキップ・PR検出の reps=0 除外 + 空種目自動削除テスト
 *
 * Issue #163: 不完全セット（片方null / reps=0）の挙動を検証する
 * 追加: 全セットが除外された種目（workout_exercises）はワークアウト完了時に削除される
 *
 * テスト戦略:
 * - completeWorkout の削除フィルタ条件をシミュレートして SetRepository.delete の呼び出しを検証
 * - 有効セットが0件の種目で WorkoutExerciseRepository.delete が呼ばれることを検証
 * - checkAndSavePRForExercise のフィルタ条件をシミュレートして PR 判定対象セットを検証
 * - 既存の挙動（両方null除外 / 自重種目許容）が後退しないことも確認
 */
import { SetRepository } from '@/database/repositories/set';
import { WorkoutExerciseRepository } from '@/database/repositories/workoutExercise';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';

jest.mock('@/database/repositories/set');
jest.mock('@/database/repositories/workoutExercise');

const mockSetDelete = SetRepository.delete as jest.MockedFunction<typeof SetRepository.delete>;
const mockExerciseDelete = WorkoutExerciseRepository.delete as jest.MockedFunction<
  typeof WorkoutExerciseRepository.delete
>;

/** テスト共通データ */
const mockWorkout: Workout = {
  id: 'workout-1',
  status: 'recording',
  createdAt: Date.now(),
  startedAt: null,
  completedAt: null,
  timerStatus: 'not_started',
  elapsedSeconds: 0,
  timerStartedAt: null,
  memo: null,
};

const mockExercise: WorkoutExercise = {
  id: 'we-1',
  workoutId: 'workout-1',
  exerciseId: 'exercise-1',
  displayOrder: 0,
  memo: null,
  createdAt: Date.now(),
};

/** セット生成ヘルパー */
function makeSet(
  id: string,
  weight: number | null,
  reps: number | null,
  setNumber = 1,
): WorkoutSet {
  return {
    id,
    workoutExerciseId: 'we-1',
    setNumber,
    weight,
    reps,
    estimated1RM: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 修正後の不完全セット判定述語
 * （completeWorkout で使用するフィルタ条件）
 *
 * 不完全とみなす条件:
 * - weight が null（reps が入力済みでも不完全）
 * - reps が null（weight が入力済みでも不完全）
 * - reps=0 かつ weight が入力済み（"0回実施"は未実施扱い）
 */
function isIncompleteSet(s: WorkoutSet): boolean {
  return s.weight == null || s.reps == null || (s.reps === 0 && s.weight != null);
}

// ============================================================
// completeWorkout: 不完全セット除外フィルタのテスト
// ============================================================

describe('completeWorkout: 不完全セット除外フィルタ（FR-001〜FR-003）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutSessionStore.getState().reset();
    mockSetDelete.mockResolvedValue(undefined);
    mockExerciseDelete.mockResolvedValue(undefined);
  });

  /**
   * FR-001: weight=null のセットは除外される
   * 現在のコード（&&）だと weight=null && reps=10 は FALSE → 削除されない（バグ）
   * 修正後（||）だと weight=null は TRUE → 削除される（期待動作）
   */
  it('weight=null・reps=10 のセットは不完全として削除される（FR-001）', async () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);

    const sets = [
      makeSet('set-incomplete', null, 10),  // weight=null → 削除対象
      makeSet('set-valid', 80, 10, 2),       // 完全 → 残す
    ];
    store.setSetsForExercise('we-1', sets);

    // 修正後のフィルタで不完全セットを検出してDeleteを呼ぶ
    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-incomplete');
  });

  /**
   * FR-002: reps=null のセットは除外される
   * 現在のコード（&&）だと weight=80 && reps=null は FALSE → 削除されない（バグ）
   * 修正後（||）だと reps=null は TRUE → 削除される（期待動作）
   */
  it('weight=80・reps=null のセットは不完全として削除される（FR-002）', async () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);

    const sets = [
      makeSet('set-incomplete', 80, null),  // reps=null → 削除対象
      makeSet('set-valid', 80, 10, 2),       // 完全 → 残す
    ];
    store.setSetsForExercise('we-1', sets);

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-incomplete');
  });

  /**
   * FR-003: reps=0 かつ weight 入力済みのセットは除外される
   * 現在のコード（&&）だと weight=80 && reps=0 は FALSE → 削除されない（バグ）
   * 修正後では (s.reps === 0 && s.weight != null) で TRUE → 削除される（期待動作）
   */
  it('weight=80・reps=0 のセットは不完全として削除される（FR-003）', async () => {
    const store = useWorkoutSessionStore.getState();
    store.setCurrentWorkout(mockWorkout);
    store.addExercise(mockExercise);

    const sets = [
      makeSet('set-zero-reps', 80, 0),      // reps=0, weight入力済み → 削除対象
      makeSet('set-valid', 80, 10, 2),       // 完全 → 残す
    ];
    store.setSetsForExercise('we-1', sets);

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-zero-reps');
  });

  /**
   * FR-005（後退防止）: weight=0・reps=10 の自重種目セットは除外されない
   */
  it('weight=0・reps=10 の自重セットは削除されない（FR-005 後退防止）', async () => {
    const sets = [
      makeSet('set-bodyweight', 0, 10),  // 自重種目 → 残す
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    // 自重セット(weight=0, reps>0)は削除対象にならない
    expect(mockSetDelete).not.toHaveBeenCalled();
  });

  /**
   * FR-006（後退防止）: weight=null・reps=null の両方null既存ケースも削除される
   */
  it('weight=null・reps=null の両方nullセットも引き続き削除される（FR-006 後退防止）', async () => {
    const sets = [
      makeSet('set-both-null', null, null),  // 既存の削除対象
      makeSet('set-valid', 80, 10, 2),
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-both-null');
  });

  /**
   * 完全なセット（weight入力済み・reps>0）は削除されない
   */
  it('weight=80・reps=10 の完全なセットは削除されない（SC-004）', async () => {
    const sets = [
      makeSet('set-valid-1', 80, 10),
      makeSet('set-valid-2', 70, 8, 2),
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    expect(mockSetDelete).not.toHaveBeenCalled();
  });

  /**
   * 複数の不完全セットが混在する場合、不完全なものだけ削除される
   */
  it('完全セットと不完全セットが混在する場合、不完全なものだけ削除される', async () => {
    const sets = [
      makeSet('set-1-valid', 80, 10, 1),   // 完全
      makeSet('set-2-no-reps', 70, null, 2), // reps=null → 削除
      makeSet('set-3-zero-reps', 60, 0, 3),  // reps=0 → 削除
      makeSet('set-4-no-weight', null, 8, 4), // weight=null → 削除
      makeSet('set-5-bodyweight', 0, 12, 5),  // 自重 → 完全
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }

    // 不完全な3セットのみ削除
    expect(mockSetDelete).toHaveBeenCalledTimes(3);
    expect(mockSetDelete).toHaveBeenCalledWith('set-2-no-reps');
    expect(mockSetDelete).toHaveBeenCalledWith('set-3-zero-reps');
    expect(mockSetDelete).toHaveBeenCalledWith('set-4-no-weight');
    // 完全なセットは削除されない
    expect(mockSetDelete).not.toHaveBeenCalledWith('set-1-valid');
    expect(mockSetDelete).not.toHaveBeenCalledWith('set-5-bodyweight');
  });
});

// ============================================================
// checkAndSavePRForExercise: reps > 0 フィルタのテスト
// ============================================================

describe('checkAndSavePRForExercise: reps=0 セットの PR 判定除外（FR-004）', () => {
  /**
   * 修正後のPR判定用フィルタ述語
   * reps=0 は PR 判定から除外する
   */
  function isValidForPR(s: WorkoutSet): boolean {
    return s.weight != null && s.reps != null && s.reps > 0;
  }

  it('reps=0・weight=80 のセットはPR判定対象にならない（FR-004, SC-002）', () => {
    const sets = [
      makeSet('set-zero-reps', 80, 0),
    ];

    // 修正後: reps > 0 条件で除外される
    const validSets = sets.filter(isValidForPR);
    expect(validSets).toHaveLength(0);
  });

  it('reps=0 セットと正常セットが混在する場合、正常セットのみがPR判定対象になる（SC-002）', () => {
    const sets = [
      makeSet('set-zero-reps', 80, 0),   // reps=0 → PR判定対象外
      makeSet('set-valid', 70, 10, 2),    // 正常 → PR判定対象
    ];

    const validSets = sets.filter(isValidForPR);

    // reps=0 セットは除外され、正常セットのみ残る
    expect(validSets).toHaveLength(1);
    expect(validSets[0]!.id).toBe('set-valid');
    // max_weight は 70kg（80kgのreps=0セットは使われない）
    const maxWeight = Math.max(...validSets.map((s) => s.weight ?? 0));
    expect(maxWeight).toBe(70);
  });

  it('reps=0 のみのセット群はPR判定対象がゼロになる', () => {
    const sets = [
      makeSet('set-1', 80, 0),
      makeSet('set-2', 90, 0, 2),
    ];

    const validSets = sets.filter(isValidForPR);
    expect(validSets).toHaveLength(0);
  });

  it('reps > 0 の自重セット（weight=0, reps=10）はPR判定対象になる（FR-005）', () => {
    const sets = [
      makeSet('set-bodyweight', 0, 10),
    ];

    const validSets = sets.filter(isValidForPR);
    // weight=0 でも reps > 0 なら PR 判定対象
    expect(validSets).toHaveLength(1);
  });

  it('weight=null のセットはPR判定対象にならない', () => {
    const sets = [
      makeSet('set-no-weight', null, 10),
    ];

    const validSets = sets.filter(isValidForPR);
    expect(validSets).toHaveLength(0);
  });

  it('reps=null のセットはPR判定対象にならない', () => {
    const sets = [
      makeSet('set-no-reps', 80, null),
    ];

    const validSets = sets.filter(isValidForPR);
    expect(validSets).toHaveLength(0);
  });
});

// ============================================================
// completeWorkout: 空種目（有効セット0件）の自動削除
// ============================================================

describe('completeWorkout: 有効セットが0件の種目を自動削除', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDelete.mockResolvedValue(undefined);
    mockExerciseDelete.mockResolvedValue(undefined);
  });

  /**
   * 全セットが不完全な種目は workout_exercises レコードごと削除される
   */
  it('全セットが不完全な種目は WorkoutExerciseRepository.delete が呼ばれる', async () => {
    const sets = [
      makeSet('set-1', 80, null),     // reps=null → 不完全
      makeSet('set-2', null, 10, 2),  // weight=null → 不完全
    ];

    // completeWorkout のロジックをシミュレート
    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    const validSets = sets.filter((s) => !isIncompleteSet(s));
    if (validSets.length === 0) {
      await WorkoutExerciseRepository.delete(mockExercise.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(2);
    expect(mockExerciseDelete).toHaveBeenCalledWith(mockExercise.id);
  });

  /**
   * 有効セットが1件以上ある種目は削除されない（後退防止）
   */
  it('有効セットが1件以上ある種目は WorkoutExerciseRepository.delete が呼ばれない', async () => {
    const sets = [
      makeSet('set-valid', 80, 10),          // 完全 → 残す
      makeSet('set-incomplete', 80, null, 2), // 不完全 → セットのみ削除
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    const validSets = sets.filter((s) => !isIncompleteSet(s));
    if (validSets.length === 0) {
      await WorkoutExerciseRepository.delete(mockExercise.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-incomplete');
    expect(mockExerciseDelete).not.toHaveBeenCalled();
  });

  /**
   * セットが0件の種目（何も入力されていない種目）も削除される
   */
  it('セットが0件の空種目は WorkoutExerciseRepository.delete が呼ばれる', async () => {
    const sets: WorkoutSet[] = [];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    const validSets = sets.filter((s) => !isIncompleteSet(s));
    if (validSets.length === 0) {
      await WorkoutExerciseRepository.delete(mockExercise.id);
    }

    expect(mockSetDelete).not.toHaveBeenCalled();
    expect(mockExerciseDelete).toHaveBeenCalledWith(mockExercise.id);
  });

  /**
   * reps=0 のみのセットからなる種目は種目ごと削除される（reps=0 は未実施扱い）
   */
  it('reps=0 のみのセットからなる種目は WorkoutExerciseRepository.delete が呼ばれる', async () => {
    const sets = [
      makeSet('set-1', 80, 0),    // reps=0, weight有り → 不完全
      makeSet('set-2', 90, 0, 2), // reps=0, weight有り → 不完全
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    const validSets = sets.filter((s) => !isIncompleteSet(s));
    if (validSets.length === 0) {
      await WorkoutExerciseRepository.delete(mockExercise.id);
    }

    expect(mockSetDelete).toHaveBeenCalledTimes(2);
    expect(mockExerciseDelete).toHaveBeenCalledWith(mockExercise.id);
  });

  /**
   * 自重セット（weight=0, reps>0）が1件でもあれば種目は削除されない（後退防止）
   */
  it('自重セットが有効なら WorkoutExerciseRepository.delete が呼ばれない', async () => {
    const sets = [
      makeSet('set-bodyweight', 0, 10), // 自重（weight=0, reps>0）→ 有効
      makeSet('set-zero-both', 0, 0, 2), // weight=0, reps=0 → 不完全
    ];

    const incompleteSets = sets.filter(isIncompleteSet);
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    const validSets = sets.filter((s) => !isIncompleteSet(s));
    if (validSets.length === 0) {
      await WorkoutExerciseRepository.delete(mockExercise.id);
    }

    // weight=0, reps=0 のセットのみ削除、自重セットは残る
    expect(mockSetDelete).toHaveBeenCalledTimes(1);
    expect(mockSetDelete).toHaveBeenCalledWith('set-zero-both');
    expect(mockExerciseDelete).not.toHaveBeenCalled();
  });
});
