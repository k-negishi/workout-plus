/**
 * 記録画面（RecordScreen）
 * ワークアウト記録のメイン画面
 * TimerBar（上部固定） + ExerciseBlockのScrollView + 種目追加・完了ボタン
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getDatabase } from '@/database/client';
import { showSuccessToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Exercise, RecordStackParamList, WorkoutSet } from '@/types';

import { ExerciseBlock } from '../components/ExerciseBlock';
import { type PreviousSetData } from '../components/SetRow';
import { TimerBar } from '../components/TimerBar';
import { usePreviousRecord } from '../hooks/usePreviousRecord';
import { useTimer } from '../hooks/useTimer';
import { useWorkoutSession } from '../hooks/useWorkoutSession';

type RecordScreenNavProp = NativeStackNavigationProp<RecordStackParamList, 'Record'>;

/**
 * 各種目の前回記録を取得する内部コンポーネント
 * usePreviousRecordはフックなので、種目ごとにラッパーコンポーネントが必要
 */
const ExerciseBlockWithPrevious: React.FC<{
  exerciseId: string;
  workoutExerciseId: string;
  exerciseMeta: Exercise | null;
  sets: WorkoutSet[];
  currentWorkoutId: string | null;
  memo: string | null;
  onWeightChange: (setId: string, weight: number | null) => void;
  onRepsChange: (setId: string, reps: number | null) => void;
  onCopyPreviousSet: (setId: string, previousSet: PreviousSetData) => void;
  onCopyAllPrevious: (workoutExerciseId: string, exerciseId: string) => void;
  onDeleteSet: (setId: string, workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onExerciseNamePress: (exerciseId: string) => void;
  onMemoChange: (workoutExerciseId: string, memo: string) => void;
}> = ({
  exerciseId,
  workoutExerciseId,
  exerciseMeta,
  sets,
  currentWorkoutId,
  memo,
  onWeightChange,
  onRepsChange,
  onCopyPreviousSet,
  onCopyAllPrevious,
  onDeleteSet,
  onAddSet,
  onExerciseNamePress,
  onMemoChange,
}) => {
  const { previousRecord } = usePreviousRecord(exerciseId, currentWorkoutId);

  if (!exerciseMeta) return null;

  return (
    <ExerciseBlock
      exercise={exerciseMeta}
      workoutExerciseId={workoutExerciseId}
      sets={sets}
      previousRecord={previousRecord}
      memo={memo}
      onWeightChange={onWeightChange}
      onRepsChange={onRepsChange}
      onCopyPreviousSet={onCopyPreviousSet}
      onCopyAllPrevious={() => onCopyAllPrevious(workoutExerciseId, exerciseId)}
      onDeleteSet={(setId) => onDeleteSet(setId, workoutExerciseId)}
      onAddSet={() => onAddSet(workoutExerciseId)}
      onExerciseNamePress={onExerciseNamePress}
      onMemoChange={(text) => onMemoChange(workoutExerciseId, text)}
    />
  );
};

export const RecordScreen: React.FC = () => {
  const navigation = useNavigation<RecordScreenNavProp>();
  const store = useWorkoutSessionStore();
  const timer = useTimer();
  const session = useWorkoutSession();

  /** 種目マスタのキャッシュ */
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});

  /** セッション開始 */
  useEffect(() => {
    void session.startSession();
  }, []);

  /** 種目マスタを読み込む */
  useEffect(() => {
    const loadExercises = async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{
        id: string;
        name: string;
        muscle_group: string;
        equipment: string;
        is_custom: 0 | 1;
        is_favorite: 0 | 1;
        created_at: number;
        updated_at: number;
      }>('SELECT * FROM exercises');
      const map: Record<string, Exercise> = {};
      for (const row of rows) {
        map[row.id] = {
          id: row.id,
          name: row.name,
          muscleGroup: row.muscle_group as Exercise['muscleGroup'],
          equipment: row.equipment as Exercise['equipment'],
          isCustom: row.is_custom === 1,
          isFavorite: row.is_favorite === 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      setExerciseMap(map);
    };
    void loadExercises();
  }, [store.currentExercises.length]);

  /** 種目追加画面へ遷移 */
  const handleAddExercise = useCallback(() => {
    navigation.navigate('ExercisePicker', { mode: 'single' });
  }, [navigation]);

  /** ワークアウト完了 */
  const handleComplete = useCallback(async () => {
    if (store.currentExercises.length === 0) return;
    try {
      const workoutId = store.currentWorkout?.id;
      await session.completeWorkout();
      showSuccessToast('ワークアウトを記録しました');
      if (workoutId) {
        navigation.replace('WorkoutSummary', { workoutId });
      }
    } catch {
      // エラートーストはuseWorkoutSession内で表示済み
    }
  }, [session, store.currentWorkout, store.currentExercises.length, navigation]);

  /** ワークアウト中止 */
  const handleDiscard = useCallback(() => {
    Alert.alert(
      'ワークアウトを中止',
      'この記録は保存されません。中止しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '中止',
          style: 'destructive',
          onPress: async () => {
            await session.discardWorkout();
            navigation.getParent()?.goBack();
          },
        },
      ]
    );
  }, [session, navigation]);

  /** セット重量変更 */
  const handleWeightChange = useCallback(
    (setId: string, weight: number | null) => {
      const exercise = store.currentExercises.find((e) => {
        const sets = store.currentSets[e.id];
        return sets?.some((s) => s.id === setId);
      });
      if (exercise) {
        void session.updateSet(setId, exercise.id, { weight });
      }
    },
    [session, store.currentExercises, store.currentSets]
  );

  /** セットレップ数変更 */
  const handleRepsChange = useCallback(
    (setId: string, reps: number | null) => {
      const exercise = store.currentExercises.find((e) => {
        const sets = store.currentSets[e.id];
        return sets?.some((s) => s.id === setId);
      });
      if (exercise) {
        void session.updateSet(setId, exercise.id, { reps });
      }
    },
    [session, store.currentExercises, store.currentSets]
  );

  /** 前回記録を1セットにコピー */
  const handleCopyPreviousSet = useCallback(
    (setId: string, previousSet: PreviousSetData) => {
      const exercise = store.currentExercises.find((e) => {
        const sets = store.currentSets[e.id];
        return sets?.some((s) => s.id === setId);
      });
      if (exercise) {
        void session.updateSet(setId, exercise.id, {
          weight: previousSet.weight,
          reps: previousSet.reps,
        });
      }
    },
    [session, store.currentExercises, store.currentSets]
  );

  /** 前回記録を全セットにコピー（stub: 個別コピーで対応） */
  const handleCopyAllPrevious = useCallback(
    (_workoutExerciseId: string, _exerciseId: string) => {
      // 前回記録の全セットコピーは各セットのコピーボタンで対応
    },
    []
  );

  /** セット削除 */
  const handleDeleteSet = useCallback(
    (setId: string, workoutExerciseId: string) => {
      void session.deleteSet(setId, workoutExerciseId);
    },
    [session]
  );

  /** セット追加 */
  const handleAddSet = useCallback(
    (workoutExerciseId: string) => {
      void session.addSet(workoutExerciseId);
    },
    [session]
  );

  /** 種目名タップ（種目履歴へ） */
  const handleExerciseNamePress = useCallback(
    (exerciseId: string) => {
      const name = exerciseMap[exerciseId]?.name ?? '';
      navigation.navigate('ExerciseHistory', { exerciseId, exerciseName: name });
    },
    [navigation]
  );

  /** 種目メモ変更 */
  const handleMemoChange = useCallback(
    async (workoutExerciseId: string, memo: string) => {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE workout_exercises SET memo = ? WHERE id = ?',
        [memo, workoutExerciseId]
      );
    },
    []
  );

  const hasExercises = store.currentExercises.length > 0;

  return (
    <View className="flex-1 bg-[#f9fafb]">
      {/* タイマーバー（上部固定） */}
      <TimerBar
        timerStatus={timer.timerStatus}
        elapsedSeconds={timer.elapsedSeconds}
        onStart={timer.startTimer}
        onPause={timer.pauseTimer}
        onResume={timer.resumeTimer}
        onDiscard={handleDiscard}
        onComplete={handleComplete}
        isCompleteDisabled={!hasExercises}
      />

      {/* スクロール領域 */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 種目ブロック一覧 */}
        {store.currentExercises.map((exercise) => (
          <ExerciseBlockWithPrevious
            key={exercise.id}
            exerciseId={exercise.exerciseId}
            workoutExerciseId={exercise.id}
            exerciseMeta={exerciseMap[exercise.exerciseId] ?? null}
            sets={store.currentSets[exercise.id] ?? []}
            currentWorkoutId={store.currentWorkout?.id ?? null}
            memo={exercise.memo}
            onWeightChange={handleWeightChange}
            onRepsChange={handleRepsChange}
            onCopyPreviousSet={handleCopyPreviousSet}
            onCopyAllPrevious={handleCopyAllPrevious}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
            onExerciseNamePress={handleExerciseNamePress}
            onMemoChange={handleMemoChange}
          />
        ))}

        {/* 種目追加ボタン */}
        <TouchableOpacity
          onPress={handleAddExercise}
          className="flex-row items-center justify-center gap-2 mx-5 mt-4 py-[14px] border border-dashed border-[#4D94FF] rounded-lg"
          accessibilityLabel="種目を追加"
        >
          <Text className="text-[14px] font-semibold text-[#4D94FF]">
            + 種目を追加
          </Text>
        </TouchableOpacity>

        {/* T041: ワークアウトメモ */}
        <View className="mx-5 mt-4">
          <Text className="text-[12px] text-[#64748b] mb-1">ワークアウトメモ</Text>
          <TextInput
            className="bg-white border border-[#e2e8f0] rounded-lg p-3 text-[14px] text-[#475569] min-h-[60px]"
            placeholder="今日の体調、感想など"
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            defaultValue={store.currentWorkout?.memo ?? ''}
            onEndEditing={(e) => {
              void session.updateWorkoutMemo(e.nativeEvent.text);
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};
