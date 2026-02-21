/**
 * T045: WorkoutDetailScreen（読み取り専用）
 * 過去のワークアウト詳細を表示する
 * 日時、所要時間、総ボリューム、種目/セット一覧
 * 「編集」→ WorkoutEditScreen、「削除」→ 削除確認ダイアログ
 */
import { type RouteProp,useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getDatabase } from '@/database/client';
import { WorkoutRepository } from '@/database/repositories/workout';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { showErrorToast, showSuccessToast } from '@/shared/components/Toast';
import type {
  Exercise,
  HomeStackParamList,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

import { calculateVolume } from '../utils/calculate1RM';

type DetailNavProp = NativeStackNavigationProp<HomeStackParamList, 'WorkoutDetail'>;
type DetailRouteProp = RouteProp<HomeStackParamList, 'WorkoutDetail'>;

/** 種目ブロックデータ */
type ExerciseBlockData = {
  workoutExercise: WorkoutExercise;
  exercise: Exercise | null;
  sets: WorkoutSet[];
};

/** 秒数をHH:MM形式にフォーマットする */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

/** タイムスタンプを日時文字列にフォーマットする */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export const WorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<DetailNavProp>();
  const route = useRoute<DetailRouteProp>();
  const { workoutId } = route.params;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseBlocks, setExerciseBlocks] = useState<ExerciseBlockData[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /** データを読み込む */
  useEffect(() => {
    const load = async () => {
      const db = await getDatabase();

      // ワークアウト本体
      const wRow = await WorkoutRepository.findById(workoutId);
      if (!wRow) return;
      setWorkout({
        id: wRow.id,
        status: wRow.status,
        createdAt: wRow.created_at,
        startedAt: wRow.started_at,
        completedAt: wRow.completed_at,
        timerStatus: wRow.timer_status,
        elapsedSeconds: wRow.elapsed_seconds,
        timerStartedAt: wRow.timer_started_at,
        memo: wRow.memo,
      });

      // 種目一覧
      const weRows = await db.getAllAsync<{
        id: string;
        workout_id: string;
        exercise_id: string;
        display_order: number;
        memo: string | null;
        created_at: number;
      }>(
        'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY display_order',
        [workoutId]
      );

      const blocks: ExerciseBlockData[] = [];
      for (const we of weRows) {
        // 種目マスタ
        const exRow = await db.getFirstAsync<{
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
          is_custom: 0 | 1;
          is_favorite: 0 | 1;
          created_at: number;
          updated_at: number;
        }>('SELECT * FROM exercises WHERE id = ?', [we.exercise_id]);

        const exercise: Exercise | null = exRow
          ? {
              id: exRow.id,
              name: exRow.name,
              muscleGroup: exRow.muscle_group as Exercise['muscleGroup'],
              equipment: exRow.equipment as Exercise['equipment'],
              isCustom: exRow.is_custom === 1,
              isFavorite: exRow.is_favorite === 1,
              createdAt: exRow.created_at,
              updatedAt: exRow.updated_at,
            }
          : null;

        // セット一覧
        const setRows = await db.getAllAsync<{
          id: string;
          workout_exercise_id: string;
          set_number: number;
          weight: number | null;
          reps: number | null;
          estimated_1rm: number | null;
          created_at: number;
          updated_at: number;
        }>(
          'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
          [we.id]
        );

        blocks.push({
          workoutExercise: {
            id: we.id,
            workoutId: we.workout_id,
            exerciseId: we.exercise_id,
            displayOrder: we.display_order,
            memo: we.memo,
            createdAt: we.created_at,
          },
          exercise,
          sets: setRows.map((s) => ({
            id: s.id,
            workoutExerciseId: s.workout_exercise_id,
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            estimated1rm: s.estimated_1rm,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          })),
        });
      }

      setExerciseBlocks(blocks);
    };
    void load();
  }, [workoutId]);

  /** 編集画面へ遷移 */
  const handleEdit = useCallback(() => {
    navigation.navigate('WorkoutEdit', { workoutId });
  }, [navigation, workoutId]);

  /** T049: 削除確認 → 削除実行 */
  const handleDelete = useCallback(async () => {
    try {
      await WorkoutRepository.delete(workoutId);
      showSuccessToast('ワークアウトを削除しました');
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch {
      showErrorToast('ワークアウトの削除に失敗しました');
    }
  }, [workoutId, navigation]);

  /** 戻る */
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!workout) {
    return (
      <View className="flex-1 bg-[#f9fafb] items-center justify-center">
        <Text className="text-[14px] text-[#64748b]">読み込み中...</Text>
      </View>
    );
  }

  // 集計
  const allSets = exerciseBlocks.flatMap((b) => b.sets);
  const totalVolume = calculateVolume(allSets);
  const totalSets = allSets.filter((s) => s.weight != null && s.reps != null).length;
  const duration = workout.elapsedSeconds;

  return (
    <View className="flex-1 bg-[#f9fafb]">
      {/* ヘッダー（ワイヤーフレーム: wd-header） */}
      <View className="flex-row items-center gap-3 px-4 py-4 bg-white border-b border-[#e2e8f0]">
        <TouchableOpacity onPress={handleBack} className="w-6 h-6 items-center justify-center">
          <Text className="text-[18px] text-[#475569]">{'←'}</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[18px] font-semibold text-[#334155]">ワークアウト詳細</Text>
          <Text className="text-[13px] text-[#64748b] mt-1">
            {formatDateTime(workout.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleEdit}
          className="px-3.5 py-1.5 border border-[#4D94FF] rounded-lg"
        >
          <Text className="text-[13px] font-semibold text-[#4D94FF]">編集</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* サマリーカード */}
        <View className="mx-4 mt-2 p-4 bg-white border border-[#e2e8f0] rounded-lg flex-row items-center">
          <View className="flex-1 items-center gap-1">
            <Text className="text-[12px] text-[#64748b]">所要時間</Text>
            <Text className="text-[16px] font-semibold text-[#334155]">
              {formatDuration(duration)}
            </Text>
          </View>
          <View className="w-px h-8 bg-[#e2e8f0]" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-[12px] text-[#64748b]">総ボリューム</Text>
            <Text className="text-[16px] font-semibold text-[#334155]">
              {totalVolume.toLocaleString()}kg
            </Text>
          </View>
          <View className="w-px h-8 bg-[#e2e8f0]" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-[12px] text-[#64748b]">セット数</Text>
            <Text className="text-[16px] font-semibold text-[#334155]">
              {totalSets}
            </Text>
          </View>
        </View>

        {/* 種目一覧 */}
        <View className="px-4 pt-2 pb-4">
          {exerciseBlocks.map((block) => (
            <View
              key={block.workoutExercise.id}
              className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-3"
            >
              {/* 種目名 */}
              <Text className="text-[16px] font-semibold text-[#4D94FF] mb-3">
                {block.exercise?.name ?? '不明な種目'}
              </Text>

              {/* セット一覧 */}
              <View className="gap-2">
                {block.sets.map((set) => (
                  <View
                    key={set.id}
                    className="flex-row items-center gap-3 px-3 py-2 rounded-lg bg-[#F0FDF4]"
                  >
                    {/* チェックアイコン */}
                    <Text className="text-[14px] text-[#10B981]">{'✓'}</Text>
                    {/* セット番号 */}
                    <Text className="text-[14px] text-[#64748b] w-4">
                      {set.setNumber}
                    </Text>
                    {/* 値 */}
                    <Text className="text-[15px] font-semibold text-[#334155] flex-1">
                      {set.weight ?? '-'}kg x {set.reps ?? '-'}
                    </Text>
                    {/* 推定1RM */}
                    {set.estimated1rm != null && (
                      <Text className="text-[12px] text-[#64748b]">
                        1RM {Math.round(set.estimated1rm)}kg
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              {/* 種目メモ */}
              {block.workoutExercise.memo && (
                <Text className="text-[12px] text-[#64748b] mt-2">
                  {block.workoutExercise.memo}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* ワークアウトメモ */}
        {workout.memo && (
          <View className="px-4 pb-4">
            <Text className="text-[12px] font-semibold text-[#64748b] mb-1">メモ</Text>
            <Text className="text-[14px] text-[#475569]">{workout.memo}</Text>
          </View>
        )}

        {/* T049: 削除ボタン */}
        <View className="items-center py-4">
          <TouchableOpacity onPress={() => setShowDeleteDialog(true)}>
            <Text className="text-[14px] text-[#EF4444]">ワークアウトを削除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* T049: 削除確認ダイアログ */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="ワークアウトを削除"
        message="この操作は取り消せません。このワークアウトの記録が完全に削除されます。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </View>
  );
};
