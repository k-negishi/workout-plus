/**
 * 記録画面（RecordScreen）
 * ワークアウト記録のメイン画面
 * TimerBar（上部固定） + ExerciseBlockのScrollView + 種目追加・完了ボタン
 *
 * T09: スタック画面化
 * - useFocusEffect + useRef → useEffect に変更（スタック遷移でアンマウントされるため）
 * - route.params で workoutId / targetDate を受け取る
 * - pendingContinuationWorkoutId 参照を完全削除（T04 で廃止）
 * - completeWorkout 後は navigate('WorkoutSummary') で遷移
 */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import { EmptyState } from '@/shared/components/EmptyState';
import { showSuccessToast } from '@/shared/components/Toast';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Exercise, HomeStackParamList, WorkoutSet } from '@/types';

import { ExerciseBlock } from '../components/ExerciseBlock';
import { TimerBar } from '../components/TimerBar';
import { usePreviousRecord } from '../hooks/usePreviousRecord';
import { useTimer } from '../hooks/useTimer';
import { useWorkoutSession } from '../hooks/useWorkoutSession';

/**
 * T09: HomeStackParamList の Record 画面 Props
 * workoutId があれば編集モード、targetDate があれば過去日付記録モード、どちらもなければ当日新規
 */
type RecordScreenNavProp = NativeStackNavigationProp<HomeStackParamList, 'Record'>;
type RecordScreenRouteProp = NativeStackScreenProps<HomeStackParamList, 'Record'>['route'];

/**
 * 各種目の前回記録を取得する内部コンポーネント
 * usePreviousRecord はフックなので、種目ごとにラッパーコンポーネントが必要
 */
const ExerciseBlockWithPrevious: React.FC<{
  exerciseId: string;
  workoutExerciseId: string;
  exerciseMeta: Exercise | null;
  sets: WorkoutSet[];
  currentWorkoutId: string | null;
  memo: string | null;
  /** 編集モード時は前回記録を非表示にする（null を渡すことで制御） */
  showPreviousRecord: boolean;
  onWeightChange: (setId: string, weight: number | null) => void;
  onRepsChange: (setId: string, reps: number | null) => void;
  onDeleteSet: (setId: string, workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onExerciseNamePress: (exerciseId: string) => void;
  onMemoChange: (workoutExerciseId: string, memo: string) => void;
  onDeleteExercise: (workoutExerciseId: string) => void;
}> = ({
  exerciseId,
  workoutExerciseId,
  exerciseMeta,
  sets,
  currentWorkoutId,
  memo,
  showPreviousRecord,
  onWeightChange,
  onRepsChange,
  onDeleteSet,
  onAddSet,
  onExerciseNamePress,
  onMemoChange,
  onDeleteExercise,
}) => {
  const { previousRecord } = usePreviousRecord(exerciseId, currentWorkoutId);

  if (!exerciseMeta) return null;

  return (
    <ExerciseBlock
      exercise={exerciseMeta}
      workoutExerciseId={workoutExerciseId}
      sets={sets}
      previousRecord={showPreviousRecord ? previousRecord : null}
      memo={memo}
      onWeightChange={onWeightChange}
      onRepsChange={onRepsChange}
      onDeleteSet={(setId) => onDeleteSet(setId, workoutExerciseId)}
      onAddSet={() => onAddSet(workoutExerciseId)}
      onExerciseNamePress={onExerciseNamePress}
      onMemoChange={(text) => onMemoChange(workoutExerciseId, text)}
      onDeleteExercise={() => onDeleteExercise(workoutExerciseId)}
    />
  );
};

export const RecordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RecordScreenNavProp>();
  const route = useRoute<RecordScreenRouteProp>();

  /**
   * T09: route.params から workoutId / targetDate を取得する
   * workoutId が存在する場合は編集モード（既存ワークアウトを再開）
   * targetDate が存在する場合は過去日付への新規記録モード
   * どちらもなければ当日の新規記録モード
   */
  const workoutId = route.params?.workoutId;
  const targetDate = route.params?.targetDate;

  /** 編集モード: workoutId が params に含まれている場合 */
  const isEditMode = !!workoutId;

  const store = useWorkoutSessionStore();
  const timer = useTimer();
  const session = useWorkoutSession();

  /** 種目マスタのキャッシュ */
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});

  /**
   * T09: useFocusEffect → useEffect に変更。
   * スタック画面はナビゲーション時にアンマウント/マウントされるため
   * useFocusEffect は不要。useEffect(fn, []) で初回マウント時のみ実行する。
   */
  useEffect(() => {
    if (workoutId) {
      // 編集モード: 既存ワークアウトを開く
      void session.startSession({ workoutId });
    } else {
      // 新規記録モード: 当日 or 過去日付（targetDate）
      void session.startSession(targetDate !== undefined ? { targetDate } : undefined);
    }
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
      const completedWorkoutId = store.currentWorkout?.id;
      await session.completeWorkout();
      showSuccessToast('ワークアウトを記録しました');
      if (completedWorkoutId) {
        // T09: RecordStack 廃止後は現在のスタック内の WorkoutSummary に遷移
        navigation.replace('WorkoutSummary', { workoutId: completedWorkoutId });
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

  /** セット削除 */
  const handleDeleteSet = useCallback(
    (setId: string, workoutExerciseId: string) => {
      void session.deleteSet(setId, workoutExerciseId);
    },
    [session],
  );

  /** 種目を削除する */
  const handleDeleteExercise = useCallback(
    (workoutExerciseId: string) => {
      void session.removeExercise(workoutExerciseId);
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
    // exerciseMap を deps に含める: マスタデータ更新後のコールバックが古い Map を参照しないよう保証
    [navigation, exerciseMap],
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

  // ヘッダーに表示する日付ラベル: 過去日付記録なら選択日、当日なら今日の日付
  const headerDateString = targetDate ?? format(new Date(), 'yyyy-MM-dd');
  const headerDateLabel = format(parseISO(headerDateString), 'M月d日のワークアウト', {
    locale: ja,
  });

  return (
    <View testID="record-screen-container" style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* 青系統ヘッダー: SafeArea吸収 + 戻るボタン（左）+ 日付タイトル（中央）+ スペーサー（右） */}
      <View
        testID="record-header"
        style={{
          backgroundColor: '#4D94FF',
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* 戻るボタン: 前の画面（HomeScreen / CalendarScreen）に戻る */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="戻る"
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* 日付タイトル: 中央寄せで現在記録中の日付を明示する */}
        <Text
          testID="record-header-title"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '600',
            color: '#ffffff',
          }}
        >
          {headerDateLabel}
        </Text>

        {/* 右スペーサー: 戻るボタンとバランスを取るための空領域 */}
        <View style={{ width: 40 }} />
      </View>

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

      {/* Issue #134: キーボード被り対策 - iOS では padding、Android では height で回避 */}
      <KeyboardAvoidingView
        testID="keyboard-avoiding-view"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* スクロール領域: keyboardShouldPersistTaps でキーボード表示中のタップを処理 */}
        <ScrollView
          testID="record-scroll-view"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
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
            showPreviousRecord={!isEditMode}
            onWeightChange={handleWeightChange}
            onRepsChange={handleRepsChange}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
            onExerciseNamePress={handleExerciseNamePress}
            onMemoChange={handleMemoChange}
            onDeleteExercise={handleDeleteExercise}
          />
        ))}

        {/* 種目追加ボタン（T09: solid border に変更） */}
        <TouchableOpacity
          onPress={handleAddExercise}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginTop: 16,
            paddingVertical: 16,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: '#e2e8f0',
            borderRadius: 8,
            backgroundColor: '#ffffff',
          }}
          accessibilityLabel="種目を追加"
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#475569' }}>+ 種目を追加</Text>
        </TouchableOpacity>

        {/* ワークアウトメモ */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
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
      </KeyboardAvoidingView>
    </View>
  );
};
