/**
 * React Navigation 7 型定義
 * ナビゲーション構造に対応するパラメータ型とScreen Props型
 *
 * T05: RecordTab 廃止・HomeStack/CalendarStack に Record フローを追加
 * T7: CalendarTab に NavigatorScreenParams を導入し、クロスタブ遷移で targetDate を渡せるようにする
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** ルートスタック（モーダル含む） */
export type RootStackParamList = {
  MainTabs: undefined;
  DiscardDialog: undefined;
};

/**
 * メインタブ（T07: 4タブ化 RecordTab 廃止）
 * Home / Calendar / Stats / AI の4タブ構成
 *
 * T7: CalendarTab に NavigatorScreenParams を指定することで、
 * 別タブから navigate('CalendarTab', { screen: 'Calendar', params: { targetDate } }) の
 * クロスタブ深リンク遷移が型安全に行えるようになる
 */
export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: NavigatorScreenParams<CalendarStackParamList>;
  StatsTab: undefined;
  AITab: undefined;
};

/**
 * ホームタブ内スタック
 * T05: WorkoutEdit 廃止、Record フローを追加
 * T08: WorkoutDetail 廃止
 */
export type HomeStackParamList = {
  Home: undefined;
  /** Record: workoutId があれば編集モード、targetDate があれば過去日付記録モード */
  Record: { workoutId?: string; targetDate?: string } | undefined;
  ExercisePicker: { mode: 'single' | 'multi' };
  WorkoutSummary: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/**
 * カレンダータブ内スタック
 * T05: WorkoutEdit 廃止、Record フローを追加
 * T08: WorkoutDetail 廃止
 */
export type CalendarStackParamList = {
  /** T6: targetDate があれば、カレンダーの選択日をその日付に切り替える */
  Calendar: { targetDate?: string } | undefined;
  /** Record: workoutId があれば編集モード、targetDate があれば過去日付記録モード */
  Record: { workoutId?: string; targetDate?: string } | undefined;
  ExercisePicker: { mode: 'single' | 'multi' };
  WorkoutSummary: { workoutId: string };
  ExerciseHistory: { exerciseId: string; exerciseName: string };
};

/** 各Screen用のProps型 */
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type CalendarScreenProps = NativeStackScreenProps<CalendarStackParamList, 'Calendar'>;

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
