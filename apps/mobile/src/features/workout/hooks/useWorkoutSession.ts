/**
 * ワークアウトセッション管理フック
 * セッション開始、種目追加、セット操作、完了の一連のフローを提供する
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { ulid } from 'ulid';

import { getDatabase } from '@/database/client';
import { PersonalRecordRepository } from '@/database/repositories/pr';
import { SetRepository } from '@/database/repositories/set';
import { WorkoutRepository } from '@/database/repositories/workout';
import { WorkoutExerciseRepository } from '@/database/repositories/workoutExercise';
import type { WorkoutRow } from '@/database/types';
import { showErrorToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { WorkoutExercise, WorkoutSet } from '@/types';
import { TimerStatus } from '@/types';

import { calculate1RM, calculateVolume } from '../utils/calculate1RM';

/**
 * 単一PR種別のチェック・保存を担うヘルパー
 * 既存PRより大きい値の場合のみupsertし、PRCheckResultを返す（小さければnull）
 */
async function checkAndSaveSinglePR(
  existing: Awaited<ReturnType<typeof PersonalRecordRepository.findByExerciseId>>,
  prType: PRCheckResult['prType'],
  value: number,
  exerciseId: string,
  workoutId: string,
  now: number,
  formatLabel: (v: number) => string,
): Promise<PRCheckResult | null> {
  if (value <= 0) return null;
  const current = existing.find((p) => p.prType === prType);
  if (!current || value > current.value) {
    await PersonalRecordRepository.upsert({
      exerciseId,
      prType,
      value,
      workoutId,
      achievedAt: now,
    });
    return { exerciseId, exerciseName: '', prType, value, label: formatLabel(value) };
  }
  return null;
}

/**
 * 1種目分のPRチェックを行い、更新があれば保存してPRCheckResultを返す
 * completeWorkout からPRロジックを分離して複雑度を下げるモジュールレベルヘルパー
 */
async function checkAndSavePRForExercise(
  exerciseId: string,
  sets: WorkoutSet[],
  workoutId: string,
  now: number,
): Promise<PRCheckResult[]> {
  // reps=0 のセットは PR 判定から除外する（reps=0 は未実施扱い）
  const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null && s.reps > 0);
  if (exerciseSets.length === 0) return [];

  const existing = await PersonalRecordRepository.findByExerciseId(exerciseId);
  const newPRs: PRCheckResult[] = [];

  const maxWeightSet = exerciseSets.reduce((max, s) =>
    (s.weight ?? 0) > (max.weight ?? 0) ? s : max,
  );
  const weightPR = await checkAndSaveSinglePR(
    existing,
    'max_weight',
    maxWeightSet.weight ?? 0,
    exerciseId,
    workoutId,
    now,
    (v) => `${v}kg`,
  );
  if (weightPR) newPRs.push(weightPR);

  const maxRepsSet = exerciseSets.reduce((max, s) => ((s.reps ?? 0) > (max.reps ?? 0) ? s : max));
  const repsPR = await checkAndSaveSinglePR(
    existing,
    'max_reps',
    maxRepsSet.reps ?? 0,
    exerciseId,
    workoutId,
    now,
    (v) => `${v} reps`,
  );
  if (repsPR) newPRs.push(repsPR);

  const volumePR = await checkAndSaveSinglePR(
    existing,
    'max_volume',
    calculateVolume(exerciseSets),
    exerciseId,
    workoutId,
    now,
    (v) => `${v}kg`,
  );
  if (volumePR) newPRs.push(volumePR);

  return newPRs;
}

/** PR チェック結果 */
export type PRCheckResult = {
  exerciseId: string;
  exerciseName: string;
  prType: 'max_weight' | 'max_volume' | 'max_reps';
  value: number;
  label: string;
};

/** ワークアウト完了時のサマリーデータ */
export type WorkoutSummaryData = {
  totalVolume: number;
  exerciseCount: number;
  setCount: number;
  elapsedSeconds: number;
  newPRs: PRCheckResult[];
};

/**
 * 'yyyy-MM-dd' 形式の日付文字列をその日の 00:00:00 ローカル時刻の UNIX ms に変換する
 * 過去日付記録時に created_at / completed_at を適切なタイムスタンプに設定するために使用する
 */
export function dateStringToMs(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year!, month! - 1, day!).getTime();
}

/**
 * recording 状態の既存ワークアウトをストアに復元する。
 * startSession の cyclomatic complexity を抑制するためモジュールレベルに分離。
 */
async function restoreExistingRecordingToStore(
  existing: WorkoutRow,
  store: ReturnType<typeof useWorkoutSessionStore.getState>,
): Promise<void> {
  store.setCurrentWorkout({
    id: existing.id,
    status: existing.status,
    createdAt: existing.created_at,
    startedAt: existing.started_at,
    completedAt: existing.completed_at,
    timerStatus: existing.timer_status,
    elapsedSeconds: existing.elapsed_seconds,
    timerStartedAt: existing.timer_started_at,
    memo: existing.memo,
  });
  store.setTimerStatus(existing.timer_status);
  store.setElapsedSeconds(existing.elapsed_seconds);
  store.setTimerStartedAt(existing.timer_started_at);

  // 関連する種目とセットをDBから読み込みストアに反映する
  const db = await getDatabase();
  const exercises = await db.getAllAsync<{
    id: string;
    workout_id: string;
    exercise_id: string;
    display_order: number;
    memo: string | null;
    created_at: number;
  }>('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order', [existing.id]);

  for (const ex of exercises) {
    const workoutExercise: WorkoutExercise = {
      id: ex.id,
      workoutId: ex.workout_id,
      exerciseId: ex.exercise_id,
      displayOrder: ex.display_order,
      memo: ex.memo,
      createdAt: ex.created_at,
    };
    store.addExercise(workoutExercise);
    // findByWorkoutExerciseId は WorkoutSet[]（camelCase 変換済み）を返す
    const sets = await SetRepository.findByWorkoutExerciseId(ex.id);
    store.setSetsForExercise(ex.id, sets);
  }
}

/**
 * 種目リストの不完全セットをDBから削除し、有効セットが0件になった種目もDBから除外する。
 * completeWorkout の cyclomatic complexity を抑制するためモジュールレベルに分離。
 *
 * @returns 有効セットが残った種目IDのSet
 */
async function cleanupExerciseSets(
  exercises: WorkoutExercise[],
  currentSets: Record<string, WorkoutSet[]>,
): Promise<Set<string>> {
  const validExerciseIds = new Set<string>();
  for (const exercise of exercises) {
    const sets = currentSets[exercise.id] ?? [];
    const incompleteSets = sets.filter(
      (s) => s.weight == null || s.reps == null || (s.reps === 0 && s.weight != null),
    );
    for (const s of incompleteSets) {
      await SetRepository.delete(s.id);
    }
    if (sets.length > incompleteSets.length) {
      // 有効セットが残る種目は記録対象として保持
      validExerciseIds.add(exercise.id);
    } else {
      // 有効セットが0件になった種目はDBから除外する（空種目削除）
      await WorkoutExerciseRepository.delete(exercise.id);
    }
  }
  return validExerciseIds;
}

/** フックの戻り値型 */
export type UseWorkoutSessionReturn = {
  /**
   * セッションを開始する。
   * workoutId を指定した場合は継続モード（当日ワークアウトへの追記）。
   * targetDate を指定した場合は過去日付記録（'yyyy-MM-dd' 形式）。
   */
  startSession: (options?: { workoutId?: string; targetDate?: string }) => Promise<void>;
  /** 種目を追加する */
  addExercise: (exerciseId: string) => Promise<void>;
  /** 種目を削除する */
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  /** セットを追加する */
  addSet: (workoutExerciseId: string) => Promise<WorkoutSet>;
  /** セットを更新する */
  updateSet: (
    setId: string,
    workoutExerciseId: string,
    params: { weight?: number | null; reps?: number | null },
  ) => Promise<void>;
  /** セットを削除する */
  deleteSet: (setId: string, workoutExerciseId: string) => Promise<void>;
  /** ワークアウトを完了する */
  completeWorkout: () => Promise<WorkoutSummaryData>;
  /** ワークアウトを破棄する */
  discardWorkout: () => Promise<void>;
  /** 種目メモを更新する（T041） */
  updateExerciseMemo: (workoutExerciseId: string, memo: string) => Promise<void>;
  /** ワークアウトメモを更新する（T041） */
  updateWorkoutMemo: (memo: string) => Promise<void>;
  /** 下書き保存する（T042） */
  saveDraft: () => Promise<void>;
  /** 編集保存＋PR再計算（T047） */
  saveEdit: (workoutId: string) => Promise<void>;
};

/**
 * ワークアウトセッションを管理するカスタムフック
 */
export function useWorkoutSession(): UseWorkoutSessionReturn {
  const store = useWorkoutSessionStore();

  /**
   * セッションを開始する。
   * workoutId を指定した場合は継続モード（当日ワークアウトへの追記）。
   * targetDate を指定した場合は過去日付記録（'yyyy-MM-dd' 形式）。
   */
  const startSession = useCallback(
    async (options?: { workoutId?: string; targetDate?: string }) => {
      // オプションオブジェクトから分解する（未指定時は両方 undefined になる）
      const { workoutId, targetDate } = options ?? {};
      try {
        // 前回セッションのストアデータをクリアする（重複キー防止）
        store.reset();
        // 過去日付が指定された場合はストアに記録する（reset() で sessionTargetDate がクリアされるため、この順序が重要）
        if (targetDate) {
          store.setSessionTargetDate(targetDate);
        }
        // 継続モード: workoutId が指定されている場合（当日ワークアウトへの追記）
        if (workoutId) {
          const targetWorkout = await WorkoutRepository.findById(workoutId);
          if (!targetWorkout) {
            showErrorToast('継続対象のワークアウトが見つかりません');
            return;
          }
          // completed → recording に再オープン
          await WorkoutRepository.update(workoutId, { status: 'recording' });
          store.setCurrentWorkout({
            id: targetWorkout.id,
            status: 'recording',
            createdAt: targetWorkout.created_at,
            startedAt: targetWorkout.started_at,
            completedAt: targetWorkout.completed_at,
            timerStatus: TimerStatus.NOT_STARTED,
            elapsedSeconds: 0,
            timerStartedAt: null,
            memo: targetWorkout.memo,
          });
          store.setTimerStatus(TimerStatus.NOT_STARTED);
          store.setElapsedSeconds(0);
          store.setTimerStartedAt(null);

          // 既存の種目・セットを復元
          const db = await getDatabase();
          const exercises = await db.getAllAsync<{
            id: string;
            workout_id: string;
            exercise_id: string;
            display_order: number;
            memo: string | null;
            created_at: number;
          }>('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order', [
            workoutId,
          ]);

          const baseExerciseIds: string[] = [];
          for (const ex of exercises) {
            const workoutExercise: WorkoutExercise = {
              id: ex.id,
              workoutId: ex.workout_id,
              exerciseId: ex.exercise_id,
              displayOrder: ex.display_order,
              memo: ex.memo,
              createdAt: ex.created_at,
            };
            store.addExercise(workoutExercise);
            baseExerciseIds.push(ex.id);

            // findByWorkoutExerciseId は WorkoutSet[]（camelCase 変換済み）を返す
            const sets = await SetRepository.findByWorkoutExerciseId(ex.id);
            store.setSetsForExercise(ex.id, sets);
          }
          // 継続モードの基準種目IDリストを記録
          store.setContinuationBaseExerciseIds(baseExerciseIds);
          return;
        }

        // targetDate指定時は別日の recording を復元しない（新規ワークアウトを常に作成する）
        if (!targetDate) {
          // 既存の recording セッションがあるか確認
          const existing = await WorkoutRepository.findRecording();
          if (existing) {
            // ヘルパーに委譲して complexity を抑制する
            await restoreExistingRecordingToStore(existing, store);
            return;
          }
        }

        // 新規セッション作成
        // targetDate が指定されている場合は過去日付を created_at に設定する
        const createParams = targetDate ? { createdAt: dateStringToMs(targetDate) } : undefined;
        const workout = await WorkoutRepository.create(createParams);
        store.setCurrentWorkout({
          id: workout.id,
          status: workout.status,
          createdAt: workout.created_at,
          startedAt: workout.started_at,
          completedAt: workout.completed_at,
          timerStatus: workout.timer_status,
          elapsedSeconds: workout.elapsed_seconds,
          timerStartedAt: workout.timer_started_at,
          memo: workout.memo,
        });
      } catch (error) {
        showErrorToast('セッションの開始に失敗しました');
        throw error;
      }
    },
    [store],
  );

  /** 種目を追加する */
  const addExercise = useCallback(
    async (exerciseId: string) => {
      if (!store.currentWorkout) return;

      // 重複チェック: 同一ワークアウト内に同じ種目が既に存在する場合はスキップ（Issue #116）
      // UI側（ExercisePickerScreen）でもタップを無効化しているが、フック側でも防護する
      if (store.currentExercises.some((e) => e.exerciseId === exerciseId)) {
        return;
      }

      const db = await getDatabase();
      const now = Date.now();
      const id = ulid();
      const displayOrder = store.currentExercises.length;

      await db.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, display_order, memo, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`,
        [id, store.currentWorkout.id, exerciseId, displayOrder, now],
      );

      const workoutExercise: WorkoutExercise = {
        id,
        workoutId: store.currentWorkout.id,
        exerciseId,
        displayOrder,
        memo: null,
        createdAt: now,
      };
      store.addExercise(workoutExercise);

      // デフォルト3セットを並行作成（Issue #119: デフォルト3セット表示対応）
      // SetRepository.create() は WorkoutSet（camelCase）を返す
      const initialSets = await Promise.all(
        [1, 2, 3].map((setNumber) => SetRepository.create({ workoutExerciseId: id, setNumber })),
      );
      store.setSetsForExercise(id, initialSets);
    },
    [store],
  );

  /** 種目を削除する */
  const removeExercise = useCallback(
    async (workoutExerciseId: string) => {
      const db = await getDatabase();
      // CASCADEでセットも削除される
      await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [workoutExerciseId]);
      store.removeExercise(workoutExerciseId);
    },
    [store],
  );

  /** セットを追加する */
  const addSet = useCallback(
    async (workoutExerciseId: string): Promise<WorkoutSet> => {
      const currentSets = store.currentSets[workoutExerciseId] ?? [];
      const nextSetNumber = currentSets.length + 1;

      // create は WorkoutSet（camelCase 変換済み）を返す
      const newSet = await SetRepository.create({
        workoutExerciseId,
        setNumber: nextSetNumber,
      });

      store.setSetsForExercise(workoutExerciseId, [...currentSets, newSet]);
      return newSet;
    },
    [store],
  );

  /** セットを更新する */
  const updateSet = useCallback(
    async (
      setId: string,
      workoutExerciseId: string,
      params: { weight?: number | null; reps?: number | null },
    ) => {
      const updatePayload: Partial<Pick<WorkoutSet, 'weight' | 'reps'>> = {};
      if (params.weight !== undefined) updatePayload.weight = params.weight;
      if (params.reps !== undefined) updatePayload.reps = params.reps;
      await SetRepository.update(setId, updatePayload);

      // ストア上のセットを更新
      const currentSets = store.currentSets[workoutExerciseId] ?? [];
      const updatedSets = currentSets.map((s) => {
        if (s.id !== setId) return s;
        const newWeight = params.weight !== undefined ? params.weight : s.weight;
        const newReps = params.reps !== undefined ? params.reps : s.reps;
        const estimated1RM =
          newWeight != null && newReps != null && newWeight > 0 && newReps > 0
            ? calculate1RM(newWeight, newReps)
            : null;
        return {
          ...s,
          weight: newWeight ?? s.weight,
          reps: newReps ?? s.reps,
          estimated1RM: estimated1RM,
          updatedAt: Date.now(),
        };
      });
      store.setSetsForExercise(workoutExerciseId, updatedSets);
    },
    [store],
  );

  /** セットを削除する */
  const deleteSet = useCallback(
    async (setId: string, workoutExerciseId: string) => {
      await SetRepository.delete(setId);

      const currentSets = store.currentSets[workoutExerciseId] ?? [];
      // セット番号を振り直す
      const remaining = currentSets
        .filter((s) => s.id !== setId)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
      store.setSetsForExercise(workoutExerciseId, remaining);
    },
    [store],
  );

  /** ワークアウトを完了する */
  const completeWorkout = useCallback(async (): Promise<WorkoutSummaryData> => {
    if (!store.currentWorkout) {
      throw new Error('進行中のワークアウトがありません');
    }

    try {
      // sessionTargetDate が設定されている場合は過去日付で保存する
      // それ以外は実際の完了時刻（Date.now()）を使用する
      const sessionTargetDate = useWorkoutSessionStore.getState().sessionTargetDate;
      const now = sessionTargetDate ? dateStringToMs(sessionTargetDate) : Date.now();

      // 不完全セットおよび空種目をDBから除外し、有効種目IDを取得
      const validExerciseIds = await cleanupExerciseSets(store.currentExercises, store.currentSets);

      // ステータスを completed に更新
      await WorkoutRepository.update(store.currentWorkout.id, {
        status: 'completed',
        completed_at: now,
      });

      // サマリーデータを集計
      let totalVolume = 0;
      let totalSetCount = 0;
      const newPRs: PRCheckResult[] = [];

      for (const exercise of store.currentExercises) {
        // 削除済み種目（有効セットが0件だったもの）はスキップ
        if (!validExerciseIds.has(exercise.id)) continue;

        const sets = store.currentSets[exercise.id] ?? [];
        const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null);
        totalSetCount += exerciseSets.length;
        totalVolume += calculateVolume(exerciseSets);

        // PR チェック（ヘルパー関数に委譲して複雑度を削減）
        const prs = await checkAndSavePRForExercise(
          exercise.exerciseId,
          sets,
          store.currentWorkout.id,
          now,
        );
        newPRs.push(...prs);
      }

      const summaryData: WorkoutSummaryData = {
        totalVolume,
        exerciseCount: validExerciseIds.size,
        setCount: totalSetCount,
        elapsedSeconds: store.elapsedSeconds,
        newPRs,
      };

      // ストアをリセット
      store.reset();

      return summaryData;
    } catch (error) {
      showErrorToast('ワークアウトの完了に失敗しました');
      throw error;
    }
  }, [store]);

  /** ワークアウトを破棄する */
  const discardWorkout = useCallback(async () => {
    if (!store.currentWorkout) return;

    // 継続モードの場合: 追加分のみ削除し、元の completed 状態に戻す
    if (store.continuationBaseExerciseIds !== null) {
      const db = await getDatabase();
      const baseIds = store.continuationBaseExerciseIds;
      // 新規追加した種目（base に含まれない）を削除
      const newExercises = store.currentExercises.filter((e) => !baseIds.includes(e.id));
      for (const ex of newExercises) {
        await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [ex.id]);
      }
      // ワークアウトを completed に戻す（completed_at は元の値を維持）
      await WorkoutRepository.update(store.currentWorkout.id, { status: 'completed' });
      store.reset();
      return;
    }

    // 通常モード: ワークアウト全体を削除
    await WorkoutRepository.delete(store.currentWorkout.id);
    store.reset();
  }, [store]);

  /**
   * T041: 種目メモを更新する
   */
  const updateExerciseMemo = useCallback(async (workoutExerciseId: string, memo: string) => {
    const db = await getDatabase();
    await db.runAsync('UPDATE workout_exercises SET memo = ? WHERE id = ?', [
      memo || null,
      workoutExerciseId,
    ]);
  }, []);

  /**
   * T041: ワークアウトメモを更新する
   */
  const updateWorkoutMemo = useCallback(
    async (memo: string) => {
      if (!store.currentWorkout) return;
      await WorkoutRepository.update(store.currentWorkout.id, {
        memo: memo || null,
      });
    },
    [store],
  );

  /**
   * T042: 下書き保存
   * 種目が1件以上ある場合のみタイマー状態をDBに永続化する
   */
  const saveDraft = useCallback(async () => {
    if (!store.currentWorkout) return;
    // 種目0件の場合は保存しない
    if (store.currentExercises.length === 0) return;

    try {
      await WorkoutRepository.update(store.currentWorkout.id, {
        timer_status: store.timerStatus,
        elapsed_seconds: store.elapsedSeconds,
        timer_started_at: store.timerStartedAt,
      });
    } catch (error) {
      showErrorToast('下書き保存に失敗しました');
      throw error;
    }
  }, [store]);

  /**
   * T042: AppState変化監視
   * background移行時に自動で下書き保存する
   */
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        saveDraft();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [saveDraft]);

  /**
   * T047: 編集保存＋PR再計算
   * WorkoutEditScreenから呼び出される
   */
  const saveEdit = useCallback(async (workoutId: string) => {
    const db = await getDatabase();
    // 対象ワークアウトの全種目のexercise_idを取得
    const weRows = await db.getAllAsync<{ exercise_id: string }>(
      'SELECT exercise_id FROM workout_exercises WHERE workout_id = ?',
      [workoutId],
    );
    const exerciseIds = new Set(weRows.map((row) => row.exercise_id));

    // 各種目のPRを再計算
    for (const exerciseId of exerciseIds) {
      await PersonalRecordRepository.recalculateForExercise(exerciseId);
    }
  }, []);

  return {
    startSession,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    discardWorkout,
    updateExerciseMemo,
    updateWorkoutMemo,
    saveDraft,
    saveEdit,
  };
}
