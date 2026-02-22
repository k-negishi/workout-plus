/**
 * 記録画面（RecordScreen）
 * ワークアウト記録のメイン画面
 * TimerBar（上部固定） + ExerciseBlockのScrollView + 種目追加・完了ボタン
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import { EmptyState } from '@/shared/components/EmptyState';
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RecordScreenNavProp>();
  const store = useWorkoutSessionStore();
  const timer = useTimer();
  const session = useWorkoutSession();

  /** 継続モード: pendingContinuationWorkoutId を読み取りクリアする */
  const pendingContinuationWorkoutId = store.pendingContinuationWorkoutId;

  /** 種目マスタのキャッシュ */
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});

  /** セッション開始 */
  useEffect(() => {
    // 継続モードの場合は pendingContinuationWorkoutId を渡してクリア
    store.setPendingContinuationWorkoutId(null);
    void session.startSession(pendingContinuationWorkoutId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** タイマー計測停止（ワークアウトは継続） */
  const handleStopTimer = useCallback(() => {
    Alert.alert(
      '計測を停止しますか？',
      'タイマーの時間は記録されません。ワークアウトは継続できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '停止する',
          style: 'destructive',
          onPress: () => timer.stopTimer(),
        },
      ],
    );
  }, [timer]);

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
    [session, store.currentExercises, store.currentSets],
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
    [session, store.currentExercises, store.currentSets],
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
    [session, store.currentExercises, store.currentSets],
  );

  /** 前回記録を全セットにコピー（stub: 個別コピーで対応） */
  const handleCopyAllPrevious = useCallback((_workoutExerciseId: string, _exerciseId: string) => {
    // 前回記録の全セットコピーは各セットのコピーボタンで対応
  }, []);

  /** セット削除 */
  const handleDeleteSet = useCallback(
    (setId: string, workoutExerciseId: string) => {
      void session.deleteSet(setId, workoutExerciseId);
    },
    [session],
  );

  /** セット追加 */
  const handleAddSet = useCallback(
    (workoutExerciseId: string) => {
      void session.addSet(workoutExerciseId);
    },
    [session],
  );

  /** 種目名タップ（種目履歴へ） */
  const handleExerciseNamePress = useCallback(
    (exerciseId: string) => {
      const name = exerciseMap[exerciseId]?.name ?? '';
      navigation.navigate('ExerciseHistory', { exerciseId, exerciseName: name });
    },
    [navigation],
  );

  /** 種目メモ変更 */
  const handleMemoChange = useCallback(async (workoutExerciseId: string, memo: string) => {
    const db = await getDatabase();
    await db.runAsync('UPDATE workout_exercises SET memo = ? WHERE id = ?', [
      memo,
      workoutExerciseId,
    ]);
  }, []);

  const hasExercises = store.currentExercises.length > 0;

  return (
    <View
      testID="record-screen-container"
      style={{ flex: 1, backgroundColor: '#f9fafb', paddingTop: insets.top }}
    >
      {/* タイマーバー（上部固定） */}
      <TimerBar
        timerStatus={timer.timerStatus}
        elapsedSeconds={timer.elapsedSeconds}
        onStart={timer.startTimer}
        onPause={timer.pauseTimer}
        onResume={timer.resumeTimer}
        onStopTimer={handleStopTimer}
        onComplete={handleComplete}
        isCompleteDisabled={!hasExercises}
      />

      {/* スクロール領域 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={
          hasExercises ? { paddingBottom: 120 } : { paddingBottom: 120, flexGrow: 1 }
        }
      >
        {/* 種目未追加時の空状態表示 */}
        {!hasExercises && (
          <EmptyState
            icon="barbell-outline"
            title="種目を追加してワークアウトを開始しましょう"
            actionLabel="+ 種目を追加"
            onAction={handleAddExercise}
          />
        )}

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
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginHorizontal: 20,
            marginTop: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#4D94FF',
            borderRadius: 8,
          }}
          accessibilityLabel="種目を追加"
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#4D94FF' }}>+ 種目を追加</Text>
        </TouchableOpacity>

        {/* T041: ワークアウトメモ */}
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>ワークアウトメモ</Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: '#475569',
              minHeight: 60,
            }}
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
