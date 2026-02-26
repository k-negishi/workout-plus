/**
 * DaySummary - 選択日のワークアウトサマリー表示
 * ワイヤーフレーム: cal-detail-section 準拠
 * 所要時間・総ボリューム・種目数・セット数、種目別セット詳細
 *
 * NativeWind レイアウト className は効かないため、全て inline style で記述する
 */
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Polyline, Svg } from 'react-native-svg';

import { getDatabase } from '@/database/client';
import type { SetRow, WorkoutExerciseRow, WorkoutRow } from '@/database/types';

/** チェックアイコン */
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
      <Polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 秒数を表示用にフォーマット */
function formatDuration(seconds: number | null, timerStatus?: string): string {
  if (timerStatus === 'discarded' || seconds == null) {
    return '―';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

/** 種目別のセットデータ */
type ExerciseSetData = {
  /** workout_exercise ID（メモ testID に使用） */
  workoutExerciseId: string;
  /** 種目 ID（ExerciseHistory 遷移時に使用） */
  exerciseId: string;
  exerciseName: string;
  /** workout_exercise.memo: 種目ごとのメモ */
  memo: string | null;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number | null;
    estimated1RM: number | null;
  }>;
};

type DaySummaryProps = {
  /** 選択日付 (yyyy-MM-dd) */
  dateString: string;
  /** 種目履歴画面への遷移（種目名タップ時に呼ばれる） */
  onNavigateToExerciseHistory?: (exerciseId: string, exerciseName: string) => void;
  /** ワークアウト取得時のコールバック: 親が削除ボタンを管理するために使用 */
  onWorkoutFound?: (workoutId: string | null) => void;
  /** 外部からのリフレッシュトリガー（値が変わるとデータを再取得する） */
  refreshKey?: number;
};

export function DaySummary({
  dateString,
  onNavigateToExerciseHistory,
  onWorkoutFound,
  refreshKey,
}: DaySummaryProps) {
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSetData[]>([]);
  const [totalSets, setTotalSets] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  // dateString 変更時に旧データを即座にクリアして、1フレームのちらつきを防ぐ
  // key={selectedDate} によるリマウントを廃止したため、この ref で前回値を追跡する
  const prevDateRef = useRef(dateString);
  if (prevDateRef.current !== dateString) {
    prevDateRef.current = dateString;
    // レンダー中に同期的に state をリセット（React のレンダー中 setState パターン）
    // これにより useEffect を待たずに即座にローディング表示に切り替わる
    setLoading(true);
    setWorkout(null);
    setExerciseSets([]);
    setTotalSets(0);
    setTotalVolume(0);
  }

  // 日付ラベル
  const dateLabel = (() => {
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy年M月d日（E）', { locale: ja }) + 'のワークアウト';
    } catch {
      return dateString;
    }
  })();

  const fetchDayData = useCallback(async () => {
    setLoading(true);
    // foundWorkoutId を finally で onWorkoutFound に渡すことで、
    // ローディング完了と削除ボタン表示を同時にバッチ更新し、ちらつきを防ぐ
    let foundWorkoutId: string | null = null;
    try {
      const db = await getDatabase();
      const date = parseISO(dateString);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 86400000; // +1日

      // その日に完了したワークアウトを取得
      const workouts = await db.getAllAsync<WorkoutRow>(
        "SELECT * FROM workouts WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at DESC LIMIT 1",
        [dayStart, dayEnd],
      );

      if (workouts.length === 0) {
        setWorkout(null);
        setExerciseSets([]);
        setTotalSets(0);
        setTotalVolume(0);
        return;
      }

      const w = workouts[0]!;
      setWorkout(w);

      // 種目と種目名を JOIN で一括取得（N+1 を1クエリに削減）
      type WorkoutExerciseWithName = WorkoutExerciseRow & { exercise_name: string };
      const exercises = await db.getAllAsync<WorkoutExerciseWithName>(
        `SELECT we.*, e.name AS exercise_name
         FROM workout_exercises we
         JOIN exercises e ON we.exercise_id = e.id
         WHERE we.workout_id = ?
         ORDER BY we.display_order`,
        [w.id],
      );

      let setsTotal = 0;
      let volumeTotal = 0;
      const exerciseData: ExerciseSetData[] = [];

      if (exercises.length > 0) {
        // 全セットを IN 句で一括取得（種目数N回を1クエリに削減）
        const workoutExerciseIds = exercises.map((e) => e.id);
        const placeholders = workoutExerciseIds.map(() => '?').join(', ');
        const allSets = await db.getAllAsync<SetRow>(
          `SELECT * FROM sets WHERE workout_exercise_id IN (${placeholders}) ORDER BY workout_exercise_id, set_number`,
          workoutExerciseIds,
        );

        // セットを workout_exercise_id ごとにグループ化
        const setsByExercise = new Map<string, SetRow[]>();
        for (const s of allSets) {
          const list = setsByExercise.get(s.workout_exercise_id) ?? [];
          list.push(s);
          setsByExercise.set(s.workout_exercise_id, list);
        }

        for (const we of exercises) {
          const sets = setsByExercise.get(we.id) ?? [];
          setsTotal += sets.length;

          const setData = sets.map((s) => {
            if (s.weight != null && s.reps != null) {
              volumeTotal += s.weight * s.reps;
            }
            return {
              setNumber: s.set_number,
              weight: s.weight,
              reps: s.reps,
              estimated1RM: s.estimated_1rm,
            };
          });

          exerciseData.push({
            workoutExerciseId: we.id,
            exerciseId: we.exercise_id,
            exerciseName: we.exercise_name,
            memo: we.memo,
            sets: setData,
          });
        }
      }

      setExerciseSets(exerciseData);
      setTotalSets(setsTotal);
      setTotalVolume(Math.round(volumeTotal));
      foundWorkoutId = w.id;
    } catch (error) {
      console.error('日次データ取得エラー:', error);
    } finally {
      // onWorkoutFound と setLoading を同じ finally で呼ぶことで React が
      // 両者をバッチ処理し、削除ボタンとサマリーが同タイミングで現れる
      onWorkoutFound?.(foundWorkoutId);
      setLoading(false);
    }
    // refreshKey を依存配列に含めることで、外部からのリフレッシュ（削除後の再取得など）に対応する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString, refreshKey]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  if (loading) {
    return (
      <View style={{ marginTop: 0, alignItems: 'center', paddingVertical: 32 }}>
        <ActivityIndicator size="small" color="#4D94FF" />
      </View>
    );
  }

  // ワークアウトなし
  if (!workout) {
    return (
      <View style={{ marginTop: 0 }}>
        <View style={{ paddingVertical: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>{dateLabel}</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 16, color: '#64748b' }}>この日はトレーニングなし</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 0 }}>
      {/* 日付ヘッダー: T5 でタップ遷移を廃止し、非インタラクティブな View に変更 */}
      <View
        testID="date-header"
        style={{
          paddingVertical: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>{dateLabel}</Text>
      </View>

      {/* サマリーカード */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 4,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#e2e8f0',
        }}
      >
        {/* 所要時間（1番目） */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748b' }}>所要時間</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>
            {formatDuration(workout.elapsed_seconds, workout.timer_status)}
          </Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* 種目数（2番目）: 総ボリュームより先に表示する方がユーザーが直感的に把握しやすいため */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748b' }}>種目数</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>
            {exerciseSets.length}
          </Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* セット数（3番目） */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748b' }}>セット数</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>{totalSets}</Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* 総ボリューム（4番目・最後）: 派生指標のため末尾に配置 */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748b' }}>総ボリューム</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>
            {totalVolume.toLocaleString()}kg
          </Text>
        </View>
      </View>

      {/* ワークアウトメモ: memo が存在する場合のみ表示 */}
      {workout.memo ? (
        <View
          testID="workout-memo"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 13, color: '#64748b' }}>{workout.memo}</Text>
        </View>
      ) : null}

      {/* 種目別セット詳細 */}
      <View style={{ gap: 12 }}>
        {exerciseSets.map((ex, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 4,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            {/* 種目名タップで ExerciseHistory 画面へ遷移する */}
            <Pressable
              onPress={() => onNavigateToExerciseHistory?.(ex.exerciseId, ex.exerciseName)}
            >
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#4D94FF', marginBottom: 8 }}>
                {ex.exerciseName}
              </Text>
            </Pressable>
            <View style={{ gap: 6 }}>
              {ex.sets.map((set) => (
                <View
                  key={set.setNumber}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    backgroundColor: '#f0fdf4',
                    gap: 8,
                  }}
                >
                  <CheckIcon />
                  <Text style={{ fontSize: 15, color: '#64748b' }}>{set.setNumber}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', flex: 1, color: '#334155' }}>
                    {set.weight ?? '-'}kg × {set.reps ?? '-'} reps
                  </Text>
                  {set.estimated1RM != null ? (
                    <Text style={{ fontSize: 13, color: '#64748b' }}>
                      1RM: {Math.round(set.estimated1RM)}kg
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            {/* 種目メモ: memo が存在する場合のみ表示 */}
            {ex.memo ? (
              <Text
                testID={`exercise-memo-${ex.workoutExerciseId}`}
                style={{ fontSize: 13, color: '#64748b', paddingTop: 8 }}
              >
                {ex.memo}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
