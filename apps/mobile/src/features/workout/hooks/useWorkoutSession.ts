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
import { showErrorToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { WorkoutExercise, WorkoutSet } from '@/types';

import { calculate1RM, calculateVolume } from '../utils/calculate1RM';

/**
 * 1種目分のPRチェックを行い、更新があれば保存してPRCheckResultを返す
 * completeWorkout からPRロジックを分離して複雑度を下げるモジュールレベルヘルパー
 */
async function checkAndSavePRForExercise(
  exerciseId: string,
  sets: WorkoutSet[],
  workoutId: string,
  now: number
): Promise<PRCheckResult[]> {
  const newPRs: PRCheckResult[] = [];
  const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null);
  if (exerciseSets.length === 0) return newPRs;

  const existing = await PersonalRecordRepository.findByExerciseId(exerciseId);

  // max_weight
  const maxWeightSet = exerciseSets.reduce((max, s) =>
    (s.weight ?? 0) > (max.weight ?? 0) ? s : max
  );
  if (maxWeightSet.weight != null && maxWeightSet.weight > 0) {
    const current = existing.find((p) => p.pr_type === 'max_weight');
    if (!current || maxWeightSet.weight > current.value) {
      await PersonalRecordRepository.upsert({ exercise_id: exerciseId, pr_type: 'max_weight', value: maxWeightSet.weight, workout_id: workoutId, achieved_at: now });
      newPRs.push({ exerciseId, exerciseName: '', prType: 'max_weight', value: maxWeightSet.weight, label: `${maxWeightSet.weight}kg` });
    }
  }

  // max_reps
  const maxRepsSet = exerciseSets.reduce((max, s) =>
    (s.reps ?? 0) > (max.reps ?? 0) ? s : max
  );
  if (maxRepsSet.reps != null && maxRepsSet.reps > 0) {
    const current = existing.find((p) => p.pr_type === 'max_reps');
    if (!current || maxRepsSet.reps > current.value) {
      await PersonalRecordRepository.upsert({ exercise_id: exerciseId, pr_type: 'max_reps', value: maxRepsSet.reps, workout_id: workoutId, achieved_at: now });
      newPRs.push({ exerciseId, exerciseName: '', prType: 'max_reps', value: maxRepsSet.reps, label: `${maxRepsSet.reps} reps` });
    }
  }

  // max_volume（種目単位の合計）
  const exerciseVolume = calculateVolume(exerciseSets);
  if (exerciseVolume > 0) {
    const current = existing.find((p) => p.pr_type === 'max_volume');
    if (!current || exerciseVolume > current.value) {
      await PersonalRecordRepository.upsert({ exercise_id: exerciseId, pr_type: 'max_volume', value: exerciseVolume, workout_id: workoutId, achieved_at: now });
      newPRs.push({ exerciseId, exerciseName: '', prType: 'max_volume', value: exerciseVolume, label: `${exerciseVolume}kg` });
    }
  }

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

/** フックの戻り値型 */
export type UseWorkoutSessionReturn = {
  /** セッションを開始する */
  startSession: () => Promise<void>;
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
    params: { weight?: number | null; reps?: number | null }
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

  /** セッションを開始する */
  const startSession = useCallback(async () => {
    try {
    // 既存の recording セッションがあるか確認
    const existing = await WorkoutRepository.findRecording();
    if (existing) {
      // 既存セッションを復元
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

      // 関連する種目とセットも復元
      const db = await getDatabase();
      const exercises = await db.getAllAsync<{
        id: string;
        workout_id: string;
        exercise_id: string;
        display_order: number;
        memo: string | null;
        created_at: number;
      }>(
        'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
        [existing.id]
      );

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

        const setRows = await SetRepository.findByWorkoutExerciseId(ex.id);
        const sets: WorkoutSet[] = setRows.map((s) => ({
          id: s.id,
          workoutExerciseId: s.workout_exercise_id,
          setNumber: s.set_number,
          weight: s.weight,
          reps: s.reps,
          estimated1rm: s.estimated_1rm,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
        store.setSetsForExercise(ex.id, sets);
      }

      return;
    }

    // 新規セッション作成
    const workout = await WorkoutRepository.create();
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
  }, [store]);

  /** 種目を追加する */
  const addExercise = useCallback(
    async (exerciseId: string) => {
      if (!store.currentWorkout) return;

      const db = await getDatabase();
      const now = Date.now();
      const id = ulid();
      const displayOrder = store.currentExercises.length;

      await db.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, display_order, memo, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`,
        [id, store.currentWorkout.id, exerciseId, displayOrder, now]
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

      // 初期セット（1セット目）を自動追加
      const setRow = await SetRepository.create({
        workout_exercise_id: id,
        set_number: 1,
      });
      store.setSetsForExercise(id, [
        {
          id: setRow.id,
          workoutExerciseId: setRow.workout_exercise_id,
          setNumber: setRow.set_number,
          weight: setRow.weight,
          reps: setRow.reps,
          estimated1rm: setRow.estimated_1rm,
          createdAt: setRow.created_at,
          updatedAt: setRow.updated_at,
        },
      ]);
    },
    [store]
  );

  /** 種目を削除する */
  const removeExercise = useCallback(
    async (workoutExerciseId: string) => {
      const db = await getDatabase();
      // CASCADEでセットも削除される
      await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [workoutExerciseId]);
      store.removeExercise(workoutExerciseId);
    },
    [store]
  );

  /** セットを追加する */
  const addSet = useCallback(
    async (workoutExerciseId: string): Promise<WorkoutSet> => {
      const currentSets = store.currentSets[workoutExerciseId] ?? [];
      const nextSetNumber = currentSets.length + 1;

      const setRow = await SetRepository.create({
        workout_exercise_id: workoutExerciseId,
        set_number: nextSetNumber,
      });

      const newSet: WorkoutSet = {
        id: setRow.id,
        workoutExerciseId: setRow.workout_exercise_id,
        setNumber: setRow.set_number,
        weight: setRow.weight,
        reps: setRow.reps,
        estimated1rm: setRow.estimated_1rm,
        createdAt: setRow.created_at,
        updatedAt: setRow.updated_at,
      };

      store.setSetsForExercise(workoutExerciseId, [...currentSets, newSet]);
      return newSet;
    },
    [store]
  );

  /** セットを更新する */
  const updateSet = useCallback(
    async (
      setId: string,
      workoutExerciseId: string,
      params: { weight?: number | null; reps?: number | null }
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
        const estimated1rm =
          newWeight != null && newReps != null && newWeight > 0 && newReps > 0
            ? calculate1RM(newWeight, newReps)
            : null;
        return {
          ...s,
          weight: newWeight ?? s.weight,
          reps: newReps ?? s.reps,
          estimated1rm: estimated1rm,
          updatedAt: Date.now(),
        };
      });
      store.setSetsForExercise(workoutExerciseId, updatedSets);
    },
    [store]
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
    [store]
  );

  /** ワークアウトを完了する */
  const completeWorkout = useCallback(async (): Promise<WorkoutSummaryData> => {
    if (!store.currentWorkout) {
      throw new Error('進行中のワークアウトがありません');
    }

    try {
      const now = Date.now();

      // weight と reps が両方 null のセットをDBから除外
      for (const exercise of store.currentExercises) {
        const sets = store.currentSets[exercise.id] ?? [];
        const nullSets = sets.filter((s) => s.weight == null && s.reps == null);
        for (const s of nullSets) {
          await SetRepository.delete(s.id);
        }
      }

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
        const sets = store.currentSets[exercise.id] ?? [];
        const exerciseSets = sets.filter((s) => s.weight != null && s.reps != null);
        totalSetCount += exerciseSets.length;
        totalVolume += calculateVolume(exerciseSets);

        // PR チェック: 各種目のmax_weight, max_volume, max_reps
        if (exerciseSets.length > 0) {
          // max_weight
          const maxWeightSet = exerciseSets.reduce((max, s) =>
            (s.weight ?? 0) > (max.weight ?? 0) ? s : max
          );
          if (maxWeightSet.weight != null && maxWeightSet.weight > 0) {
            const existing = await PersonalRecordRepository.findByExerciseId(exercise.exerciseId);
            const currentMaxWeight = existing.find((p) => p.pr_type === 'max_weight');
            if (!currentMaxWeight || maxWeightSet.weight > currentMaxWeight.value) {
              await PersonalRecordRepository.upsert({
                exercise_id: exercise.exerciseId,
                pr_type: 'max_weight',
                value: maxWeightSet.weight,
                workout_id: store.currentWorkout.id,
                achieved_at: now,
              });
              // 種目名はUI側で解決するためexerciseIdのみ返す
              newPRs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: '',
                prType: 'max_weight',
                value: maxWeightSet.weight,
                label: `${maxWeightSet.weight}kg`,
              });
            }
          }

          // max_reps
          const maxRepsSet = exerciseSets.reduce((max, s) =>
            (s.reps ?? 0) > (max.reps ?? 0) ? s : max
          );
          if (maxRepsSet.reps != null && maxRepsSet.reps > 0) {
            const existing = await PersonalRecordRepository.findByExerciseId(exercise.exerciseId);
            const currentMaxReps = existing.find((p) => p.pr_type === 'max_reps');
            if (!currentMaxReps || maxRepsSet.reps > currentMaxReps.value) {
              await PersonalRecordRepository.upsert({
                exercise_id: exercise.exerciseId,
                pr_type: 'max_reps',
                value: maxRepsSet.reps,
                workout_id: store.currentWorkout.id,
                achieved_at: now,
              });
              newPRs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: '',
                prType: 'max_reps',
                value: maxRepsSet.reps,
                label: `${maxRepsSet.reps} reps`,
              });
            }
          }

          // max_volume（種目単位の合計）
          const exerciseVolume = calculateVolume(exerciseSets);
          if (exerciseVolume > 0) {
            const existing = await PersonalRecordRepository.findByExerciseId(exercise.exerciseId);
            const currentMaxVolume = existing.find((p) => p.pr_type === 'max_volume');
            if (!currentMaxVolume || exerciseVolume > currentMaxVolume.value) {
              await PersonalRecordRepository.upsert({
                exercise_id: exercise.exerciseId,
                pr_type: 'max_volume',
                value: exerciseVolume,
                workout_id: store.currentWorkout.id,
                achieved_at: now,
              });
              newPRs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: '',
                prType: 'max_volume',
                value: exerciseVolume,
                label: `${exerciseVolume}kg`,
              });
            }
          }
        }
      }

      const summaryData: WorkoutSummaryData = {
        totalVolume,
        exerciseCount: store.currentExercises.length,
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
    await WorkoutRepository.delete(store.currentWorkout.id);
    store.reset();
  }, [store]);

  /**
   * T041: 種目メモを更新する
   */
  const updateExerciseMemo = useCallback(
    async (workoutExerciseId: string, memo: string) => {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE workout_exercises SET memo = ? WHERE id = ?',
        [memo || null, workoutExerciseId]
      );
    },
    []
  );

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
    [store]
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
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current === 'active' &&
          (nextAppState === 'background' || nextAppState === 'inactive')
        ) {
          saveDraft();
        }
        appStateRef.current = nextAppState;
      },
    );
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
      [workoutId]
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
