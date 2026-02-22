/**
 * DaySummary - 選択日のワークアウトサマリー表示
 * ワイヤーフレーム: cal-detail-section 準拠
 * 所要時間・総ボリューム・種目数・セット数、種目別セット詳細
 *
 * NativeWind レイアウト className は効かないため、全て inline style で記述する
 */
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Path, Polyline, Svg } from 'react-native-svg';

import { getDatabase } from '@/database/client';
import type { ExerciseRow, SetRow, WorkoutExerciseRow, WorkoutRow } from '@/database/types';

/** チェックアイコン */
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
      <Polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 矢印アイコン（右向き） */
function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
      <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
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
  exerciseName: string;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number | null;
    estimated1rm: number | null;
  }>;
};

type DaySummaryProps = {
  /** 選択日付 (yyyy-MM-dd) */
  dateString: string;
  /** ワークアウト詳細画面への遷移 */
  onNavigateToDetail?: (workoutId: string) => void;
};

export function DaySummary({ dateString, onNavigateToDetail }: DaySummaryProps) {
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSetData[]>([]);
  const [totalSets, setTotalSets] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

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
        setLoading(false);
        return;
      }

      const w = workouts[0]!;
      setWorkout(w);

      // 種目一覧を取得
      const exercises = await db.getAllAsync<WorkoutExerciseRow>(
        'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
        [w.id],
      );

      let setsTotal = 0;
      let volumeTotal = 0;
      const exerciseData: ExerciseSetData[] = [];

      for (const we of exercises) {
        // 種目名を取得
        const exercise = await db.getFirstAsync<ExerciseRow>(
          'SELECT * FROM exercises WHERE id = ?',
          [we.exercise_id],
        );

        // セットを取得
        const sets = await db.getAllAsync<SetRow>(
          'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
          [we.id],
        );

        setsTotal += sets.length;

        const setData = sets.map((s) => {
          if (s.weight != null && s.reps != null) {
            volumeTotal += s.weight * s.reps;
          }
          return {
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            estimated1rm: s.estimated_1rm,
          };
        });

        exerciseData.push({
          exerciseName: exercise?.name ?? '不明な種目',
          sets: setData,
        });
      }

      setExerciseSets(exerciseData);
      setTotalSets(setsTotal);
      setTotalVolume(Math.round(volumeTotal));
    } catch (error) {
      console.error('日次データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  if (loading) {
    return (
      <View style={{ marginTop: 20, alignItems: 'center', paddingVertical: 32 }}>
        <ActivityIndicator size="small" color="#4D94FF" />
      </View>
    );
  }

  // ワークアウトなし
  if (!workout) {
    return (
      <View style={{ marginTop: 20 }}>
        <View style={{ paddingVertical: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>{dateLabel}</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 14, color: '#64748b' }}>この日はトレーニングなし</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 20 }}>
      {/* 日付ヘッダー（タップでワークアウト詳細へ） */}
      <Pressable
        style={{
          paddingVertical: 12,
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onPress={() => onNavigateToDetail?.(workout.id)}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>{dateLabel}</Text>
        <ChevronRight />
      </Pressable>

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
          <Text style={{ fontSize: 11, color: '#64748b' }}>所要時間</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>
            {formatDuration(workout.elapsed_seconds, workout.timer_status)}
          </Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* 種目数（2番目）: 総ボリュームより先に表示する方がユーザーが直感的に把握しやすいため */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>種目数</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>
            {exerciseSets.length}
          </Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* セット数（3番目） */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>セット数</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>{totalSets}</Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0' }} />
        {/* 総ボリューム（4番目・最後）: 派生指標のため末尾に配置 */}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>総ボリューム</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>
            {totalVolume.toLocaleString()}kg
          </Text>
        </View>
      </View>

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
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#4D94FF', marginBottom: 8 }}>
              {ex.exerciseName}
            </Text>
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
                  <Text style={{ fontSize: 13, color: '#64748b', width: 14 }}>{set.setNumber}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: '#334155' }}>
                    {set.weight ?? '-'}kg × {set.reps ?? '-'}
                  </Text>
                  {set.estimated1rm != null ? (
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      1RM: {Math.round(set.estimated1rm)}kg
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
