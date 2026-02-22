/**
 * React Navigation 7 型定義
 * ナビゲーション構造に対応するパラメータ型とScreen Props型
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** ルートスタック（モーダル含む） */
export type RootStackParamList = {
  MainTabs: undefined;
  RecordStack: undefined;
  DiscardDialog: undefined;
};

/** メインタブ */
export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  /** 記録開始ボタン（ダミー: タブとして描画はしない） */
  RecordButton: undefined;
  StatsTab: undefined;
  AITab: undefined;
};

/** ホームタブ内スタック */
export type HomeStackParamList = {
  Home: undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutEdit: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/** カレンダータブ内スタック */
export type CalendarStackParamList = {
  Calendar: undefined;
  WorkoutDetail: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/** 記録スタック（フルスクリーンモーダル） */
export type RecordStackParamList = {
  Record: undefined;
  ExercisePicker: { mode: 'single' | 'multi' };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
  WorkoutSummary: { workoutId: string };
};

/** 各Screen用のProps型 */
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type WorkoutDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'WorkoutDetail'>;
export type WorkoutEditScreenProps = NativeStackScreenProps<HomeStackParamList, 'WorkoutEdit'>;
export type CalendarScreenProps = NativeStackScreenProps<CalendarStackParamList, 'Calendar'>;
export type CalendarWorkoutDetailScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'WorkoutDetail'
>;
export type RecordScreenProps = NativeStackScreenProps<RecordStackParamList, 'Record'>;
export type ExercisePickerScreenProps = NativeStackScreenProps<
  RecordStackParamList,
  'ExercisePicker'
>;
export type ExerciseHistoryScreenProps = NativeStackScreenProps<
  RecordStackParamList,
  'ExerciseHistory'
>;
export type WorkoutSummaryScreenProps = NativeStackScreenProps<
  RecordStackParamList,
  'WorkoutSummary'
>;
export type HomeExerciseHistoryScreenProps = NativeStackScreenProps<HomeStackParamList, 'ExerciseHistory'>;
export type CalendarExerciseHistoryScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'ExerciseHistory'
>;
export type AITabScreenProps = BottomTabScreenProps<MainTabParamList, 'AITab'>;
export type MainTabScreenProps = BottomTabScreenProps<MainTabParamList>;
