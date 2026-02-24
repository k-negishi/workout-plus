/**
 * ワークアウト履歴コンテキスト構築ユーティリティ
 *
 * SQLite からワークアウト履歴を取得し、メッセージのキーワードに応じて
 * フィルタリングした WorkoutHistoryContext を返す。
 *
 * ## 設計方針（Approach A: キーワードベース動的取得）
 * - メッセージに種目名が含まれる → 該当種目のワークアウトのみ絞り込む
 * - 「先週」「今週」が含まれる → 直近7日分
 * - 「先月」が含まれる → 直近30日分
 * - デフォルト → 直近3ヶ月分（90日）
 *
 * strategy フィールドは 'recent_months' のまま維持する。
 * API 側は data の内容を使うだけのため、Mobile 側フィルタリングと整合性あり。
 */

import { getDatabase } from '@/database/client';
import { SetRepository } from '@/database/repositories/set';
import { WorkoutRepository } from '@/database/repositories/workout';
import type { WorkoutRow } from '@/database/types';

import type { WorkoutHistoryContext, WorkoutSummary } from '../types/index';

/** 直近3ヶ月（ミリ秒換算） */
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
/** 直近1ヶ月（ミリ秒換算） */
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
/** 直近1週間（ミリ秒換算） */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * workout_exercises と exercises を JOIN して取得する行型
 * リポジトリ層は exercise の JOIN を提供していないため、ここで直接クエリする
 */
type WorkoutExerciseWithExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  display_order: number;
  memo: string | null;
  created_at: number;
  /** exercises.name */
  name: string;
  /** exercises.muscle_group */
  muscle_group: string;
};

/**
 * メッセージから日付フィルタの期間（ミリ秒）を解析する
 *
 * 「先週」「今週」→ 7日、「先月」→ 30日、それ以外 → 90日（デフォルト）
 */
function parseDateRangeFromMessage(message: string): number {
  if (message.includes('先週') || message.includes('今週')) {
    return ONE_WEEK_MS;
  }
  if (message.includes('先月')) {
    return ONE_MONTH_MS;
  }
  return THREE_MONTHS_MS;
}

/**
 * メッセージから種目名キーワードを抽出する
 *
 * exercises の name と照合してフィルタリングに使う。
 * 現時点では配列形式で返すが、将来的に複数種目への拡張も可能。
 */
function parseExerciseKeywordsFromMessage(message: string, exerciseNames: string[]): string[] {
  // ワークアウト履歴内に存在する種目名と完全一致・部分一致でキーワードを抽出
  return exerciseNames.filter((name) => message.includes(name));
}

/**
 * 指定した workout_id の exercises（JOIN 済み）をまとめて取得する
 */
async function fetchExercisesWithNames(
  workoutId: string,
): Promise<WorkoutExerciseWithExerciseRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<WorkoutExerciseWithExerciseRow>(
    `SELECT we.id, we.workout_id, we.exercise_id, we.display_order, we.memo, we.created_at,
            e.name, e.muscle_group
     FROM workout_exercises we
     INNER JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.display_order`,
    [workoutId],
  );
}

/**
 * WorkoutRow + exercises + sets から WorkoutSummary を構築する
 *
 * workout_date が null のワークアウトは skip する（完了フローが正常でないデータ）。
 */
async function buildSummaryFromWorkout(workout: WorkoutRow): Promise<WorkoutSummary | null> {
  // workout_date が null のレコードは異常データとして除外
  if (!workout.workout_date) {
    return null;
  }

  const exerciseRows = await fetchExercisesWithNames(workout.id);

  const exercises = await Promise.all(
    exerciseRows.map(async (exRow) => {
      const sets = await SetRepository.findByWorkoutExerciseId(exRow.id);
      return {
        name: exRow.name,
        muscleGroup: exRow.muscle_group,
        sets: sets.map((s) => ({ weight: s.weight, reps: s.reps })),
      };
    }),
  );

  return {
    date: workout.workout_date,
    exercises,
    memo: workout.memo,
  };
}

/**
 * ワークアウト履歴コンテキストを構築する
 *
 * メッセージのキーワードに応じて取得期間・種目を動的に絞り込み、
 * AI への送信データ量を最小化する（Approach A）。
 *
 * @param message - ユーザーが送信したメッセージ本文
 * @returns WorkoutHistoryContext（strategy='recent_months' 固定）
 */
export async function buildWorkoutHistoryContext(message: string): Promise<WorkoutHistoryContext> {
  // 日付フィルタ期間をメッセージから解析
  const rangeMs = parseDateRangeFromMessage(message);
  const cutoffTime = Date.now() - rangeMs;

  // 完了済みワークアウトを全件取得（created_at DESC）
  const allWorkouts = await WorkoutRepository.findAllCompleted();

  // 期間フィルタを適用
  const filteredByDate = allWorkouts.filter((w) => w.created_at >= cutoffTime);

  // WorkoutSummary を並列構築（null は除外）
  const summaryResults = await Promise.all(filteredByDate.map((w) => buildSummaryFromWorkout(w)));
  const summaries = summaryResults.filter((s): s is WorkoutSummary => s !== null);

  // 種目名キーワードが含まれる場合は該当種目のみに絞り込む
  const allExerciseNames = Array.from(
    new Set(summaries.flatMap((s) => s.exercises.map((e) => e.name))),
  );
  const matchedKeywords = parseExerciseKeywordsFromMessage(message, allExerciseNames);

  let finalSummaries = summaries;
  if (matchedKeywords.length > 0) {
    // キーワードに一致する種目を含むワークアウトのみ残し、
    // 各ワークアウト内でも該当種目のみに絞り込む
    finalSummaries = summaries
      .map((s) => ({
        ...s,
        exercises: s.exercises.filter((e) => matchedKeywords.includes(e.name)),
      }))
      .filter((s) => s.exercises.length > 0);
  }

  return {
    strategy: 'recent_months',
    data: finalSummaries,
  };
}
