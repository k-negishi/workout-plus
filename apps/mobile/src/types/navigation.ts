/**
 * React Navigation 7 型定義
 * ナビゲーション構造に対応するパラメータ型とScreen Props型
 *
 * T05: RecordTab 廃止・HomeStack/CalendarStack に Record フローを追加
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** ルートスタック（モーダル含む） */
export type RootStackParamList = {
  MainTabs: undefined;
  DiscardDialog: undefined;
};

/**
 * メインタブ（T07: 4タブ化 RecordTab 廃止）
 * Home / Calendar / Stats / AI の4タブ構成
 */
export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  StatsTab: undefined;
  AITab: undefined;
};

/**
 * ホームタブ内スタック
 * T05: WorkoutEdit 廃止、Record フローを追加
 */
export type HomeStackParamList = {
  Home: undefined;
  WorkoutDetail: { workoutId: string };
  /** Record: workoutId があれば編集モード、targetDate があれば過去日付記録モード */
  Record: { workoutId?: string; targetDate?: string } | undefined;
  ExercisePicker: { mode: 'single' | 'multi' };
  WorkoutSummary: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/**
 * カレンダータブ内スタック
 * T05: WorkoutEdit 廃止、Record フローを追加
 */
export type CalendarStackParamList = {
  Calendar: undefined;
  WorkoutDetail: { workoutId: string };
  /** Record: workoutId があれば編集モード、targetDate があれば過去日付記録モード */
  Record: { workoutId?: string; targetDate?: string } | undefined;
  ExercisePicker: { mode: 'single' | 'multi' };
  WorkoutSummary: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/** 各Screen用のProps型 */
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type WorkoutDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'WorkoutDetail'>;
export type CalendarScreenProps = NativeStackScreenProps<CalendarStackParamList, 'Calendar'>;
export type CalendarWorkoutDetailScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'WorkoutDetail'
>;

/**
 * T05: HomeStack の Record 画面 Props
 * route.params は { workoutId?, targetDate? } | undefined
 */
export type HomeRecordScreenProps = NativeStackScreenProps<HomeStackParamList, 'Record'>;

/**
 * T05: CalendarStack の Record 画面 Props
 */
export type CalendarRecordScreenProps = NativeStackScreenProps<CalendarStackParamList, 'Record'>;

/** HomeStack 向け ExercisePicker Props */
export type HomeExercisePickerScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'ExercisePicker'
>;

/** CalendarStack 向け ExercisePicker Props */
export type CalendarExercisePickerScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'ExercisePicker'
>;

/** HomeStack 向け WorkoutSummary Props */
export type HomeWorkoutSummaryScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'WorkoutSummary'
>;

/** CalendarStack 向け WorkoutSummary Props */
export type CalendarWorkoutSummaryScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'WorkoutSummary'
>;

export type HomeExerciseHistoryScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'ExerciseHistory'
>;
export type CalendarExerciseHistoryScreenProps = NativeStackScreenProps<
  CalendarStackParamList,
  'ExerciseHistory'
>;
export type AITabScreenProps = BottomTabScreenProps<MainTabParamList, 'AITab'>;
export type MainTabScreenProps = BottomTabScreenProps<MainTabParamList>;
