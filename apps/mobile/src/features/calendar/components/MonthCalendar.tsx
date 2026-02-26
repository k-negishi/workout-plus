/**
 * MonthCalendar - ScrollView 3パネル方式のカレンダーコンポーネント
 *
 * Google カレンダーと同様の横スライドアニメーションを実現する。
 * アーキテクチャ: [前月][当月][翌月] の3パネルをScrollViewで並べ、
 * ページ変更後は中央（index 1）にリセットすることで無限スクロールを実現する。
 *
 * なぜScrollViewか:
 * iOS では react-native-gesture-handler の GestureDetector が Calendar 内部の
 * TouchableOpacity（onResponderTerminationRequest: false）と競合してタップが効かなくなる。
 * iOS UIKit の UIScrollView は内部の Touchable と自然に共存できる（Issue #160 教訓）。
 *
 * アニメーションフロー（矢印ボタン）:
 * 1. scrollTo({ animated: true }) でターゲットパネルへアニメーション
 * 2. 300ms後に displayMonth を更新（months 配列が再計算される）
 * 3. scrollTo({ animated: false }) で中央にスナップ
 *
 * アニメーションフロー（スワイプ）:
 * pagingEnabled により自然なページング → onMomentumScrollEnd → displayMonth 更新 → 中央リセット
 */
import {
  addMonths,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DateData, MarkedDates } from 'react-native-calendars/src/types';

// 日本語ロケール設定
LocaleConfig.locales['ja'] = {
  monthNames: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  monthNamesShort: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

// 矢印ボタンのスクロールアニメーション時間（ScrollView の animated: true のデフォルトに合わせる）
const ANIMATION_DURATION_MS = 300;

// 親 CalendarScreen の px-5（paddingHorizontal: 20 × 2）。
// 初期 containerWidth を Dimensions.get('window').width からこの分を差し引くことで、
// onLayout 計測前のフラッシュ（一瞬大きく表示→縮小）を防ぐ (#171)
const PARENT_HORIZONTAL_PADDING = 40;

type MonthCalendarProps = {
  /** トレーニングした日付のリスト */
  trainingDates: Date[];
  /** 選択中の日付 */
  selectedDate: string | null;
  /** 日付タップ時のコールバック */
  onDayPress: (dateString: string) => void;
  /** 月変更時のコールバック（アニメーション完了後に呼ばれる） */
  onMonthChange?: (dateString: string) => void;
};

export const MonthCalendar = React.memo(function MonthCalendar({
  trainingDates,
  selectedDate,
  onDayPress,
  onMonthChange,
}: MonthCalendarProps) {
  // useMemo で参照を安定化し、markedDates の useMemo が毎レンダーで無効化されるのを防ぐ
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayMonth = useMemo(() => startOfMonth(new Date()), []);

  // 現在表示中の月（Date オブジェクトで管理して計算を簡略化）
  const [displayMonth, setDisplayMonth] = useState(todayMonth);

  // onLayout で取得したコンテナ幅。
  // 親 CalendarScreen の px-5（paddingHorizontal: 20px × 2）を差し引いた値で初期化し、
  // onLayout 計測までのフラッシュ（一瞬大きく表示→縮小）を防ぐ (#171)
  const [containerWidth, setContainerWidth] = useState(
    () => Dimensions.get('window').width - PARENT_HORIZONTAL_PADDING,
  );

  // アニメーション中の多重発火防止フラグ
  const [isAnimating, setIsAnimating] = useState(false);

  // Calendar の強制リマウントキー
  // react-native-calendars は current 変更後の markedDates 更新を反映しないため、
  // 月変更完了時にインクリメントして Calendar を再マウントする
  const [monthChangeKey, setMonthChangeKey] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  // アニメーション中の同期ガード（ref）
  // isAnimating state は React のバッチ更新で commit が遅れるため、
  // scrollTo() の直後に onMomentumScrollEnd が発火すると stale な false を読む。
  // ref は即座に更新されるため、ネイティブイベントの競合を防げる。
  const isAnimatingRef = useRef(false);

  // stale closure 対策: 最新値を ref で保持
  const containerWidthRef = useRef(containerWidth);
  containerWidthRef.current = containerWidth;
  const displayMonthRef = useRef(displayMonth);
  displayMonthRef.current = displayMonth;
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;

  // 3パネル分の表示月を計算（前月・当月・翌月）
  const months = useMemo(
    () => [subMonths(displayMonth, 1), displayMonth, addMonths(displayMonth, 1)],
    [displayMonth],
  );

  // 翌月への移動制限: 当月以降は disabled
  const isNextMonthDisabled = useMemo(
    () => isSameMonth(displayMonth, todayMonth) || isBefore(todayMonth, displayMonth),
    [displayMonth, todayMonth],
  );

  // マーキングデータを生成
  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};

    // トレーニング日に薄いブルー背景を設定（ドットより視認しやすい）
    for (const date of trainingDates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      marks[dateStr] = {
        ...(marks[dateStr] ?? {}),
        selected: true,
        selectedColor: '#E6F2FF',
        selectedTextColor: '#4D94FF',
      };
    }

    // 選択中の日付
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        selected: true,
        selectedColor: '#4D94FF',
        selectedTextColor: '#FFFFFF',
      };
    }

    // 今日
    // todayTextColor は MarkingProps 型定義に含まれないが、
    // react-native-calendars は実行時に todayTextColor を参照する。
    if (!selectedDate || selectedDate !== today) {
      marks[today] = {
        ...(marks[today] ?? {}),
        todayTextColor: '#4D94FF',
      } as (typeof marks)[string];
    }

    return marks;
  }, [trainingDates, selectedDate, today]);

  // 日付タップハンドラ（未来日は無効）
  const handleDayPress = useCallback(
    (day: DateData) => {
      // 'yyyy-MM-dd' 文字列を UTC ではなくローカル日付として安全に解釈する
      const [year, month, date] = day.dateString.split('-').map(Number);
      const selected = new Date(year!, month! - 1, date!);
      const endOfToday = new Date(startOfDay(new Date()).getTime() + 86400000);

      // 今日以前のみ選択可能
      if (isBefore(selected, endOfToday)) {
        onDayPress(day.dateString);
      }
    },
    [onDayPress],
  );

  // ScrollView を中央（index 1）にリセットする
  // - 呼び出し側（handlePrev/Next/MomentumScrollEnd）が先に onMonthChange を呼んでいるため
  //   ここでは呼ばない。これにより setDisplayMonth + onMonthChange が同一レンダーにバッチされ、
  //   1日の青丸が即座に表示される（中間レンダーで「選択なし」が見えなくなる）
  // - monthChangeKey をインクリメントすることで Calendar を強制リマウントし、
  //   react-native-calendars が current 変更後に markedDates を反映しない問題を回避する
  const resetToCenter = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: containerWidthRef.current, animated: false });
      setIsAnimating(false);
      isAnimatingRef.current = false;
      setMonthChangeKey((prev) => prev + 1);
    }, 0);
  }, []);

  // スワイプ完了時のハンドラ（pagingEnabled により index 0 or 2 で止まる）
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // isAnimatingRef を参照（state と違い commit 前でも即座に正確な値を持つ）
      if (isAnimatingRef.current) return;
      const x = event.nativeEvent.contentOffset.x;
      const cw = containerWidthRef.current;
      if (cw === 0) return;

      const index = Math.round(x / cw);

      if (index === 0) {
        // 前月方向: isAnimatingRef をセットして二重スワイプを防ぐ
        isAnimatingRef.current = true;
        const newMonth = subMonths(displayMonthRef.current, 1);
        // setDisplayMonth と onMonthChange を同一同期ブロックで呼ぶことで
        // React 18 の自動バッチングにより同一レンダーで確定し、1日の青丸が即座に表示される
        setDisplayMonth(newMonth);
        onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
        resetToCenter();
      } else if (index === 2) {
        // 翌月方向: 当月以降はブロック
        if (isNextMonthDisabled) {
          scrollViewRef.current?.scrollTo({ x: cw, animated: false });
          return;
        }
        isAnimatingRef.current = true;
        const newMonth = addMonths(displayMonthRef.current, 1);
        setDisplayMonth(newMonth);
        onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
        resetToCenter();
      }
      // index === 1: 中央のまま（何もしない）
    },
    [isNextMonthDisabled, resetToCenter],
  );

  // 前月ボタン: ScrollView を左（index 0）にアニメーションし、完了後に月を更新
  const handlePrevMonth = useCallback(() => {
    // isAnimatingRef.current を同期チェック（state より確実）
    if (isAnimatingRef.current) return;
    // scrollTo() より前に ref をセットすることで、
    // animated scroll が onMomentumScrollEnd をトリガーしても即座にブロックできる
    isAnimatingRef.current = true;
    setIsAnimating(true);

    // index 0（前月パネル）へスクロールアニメーション
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });

    // アニメーション完了後に displayMonth + onMonthChange を同一バッチで更新する
    // scrollTo({ animated: true }) は onMomentumScrollEnd を発火しないため setTimeout で待機
    setTimeout(() => {
      const newMonth = subMonths(displayMonthRef.current, 1);
      // setDisplayMonth と onMonthChange を同一同期ブロックで呼ぶ
      // → React 18 自動バッチングで同一レンダーに統合 → 1日の青丸が即座に表示される
      setDisplayMonth(newMonth);
      onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
      resetToCenter();
    }, ANIMATION_DURATION_MS);
  }, [resetToCenter]);

  // 翌月ボタン: ScrollView を右（index 2）にアニメーションし、完了後に月を更新
  const handleNextMonth = useCallback(() => {
    if (isAnimatingRef.current || isNextMonthDisabled) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);

    // index 2（翌月パネル）へスクロールアニメーション
    scrollViewRef.current?.scrollTo({
      x: containerWidthRef.current * 2,
      animated: true,
    });

    setTimeout(() => {
      const newMonth = addMonths(displayMonthRef.current, 1);
      setDisplayMonth(newMonth);
      onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
      resetToCenter();
    }, ANIMATION_DURATION_MS);
  }, [isNextMonthDisabled, resetToCenter]);

  // コンテナ幅を onLayout で動的取得（初期値との誤差を補正する）
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  // カスタムヘッダーの月名（例: 2026年2月）
  const headerTitle = `${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月`;

  return (
    <View onLayout={handleLayout} testID="calendar-container" style={{ marginBottom: -12 }}>
      {/* カスタムヘッダー: 月名 + 矢印ボタン */}
      <View style={styles.header}>
        <Pressable
          onPress={handlePrevMonth}
          testID="prev-month-button"
          style={styles.arrowButton}
          accessibilityLabel="前月"
          accessibilityRole="button"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>{headerTitle}</Text>

        <Pressable
          onPress={handleNextMonth}
          testID="next-month-button"
          disabled={isNextMonthDisabled}
          style={styles.arrowButton}
          accessibilityLabel="翌月"
          accessibilityRole="button"
        >
          <Text style={[styles.arrowText, isNextMonthDisabled && styles.arrowDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* 3パネルScrollView: [前月][当月][翌月] */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // ページ変更処理中はスクロールを無効化して多重発火を防ぐ
        scrollEnabled={!isAnimating}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // 初期位置を中央（index 1）に設定
        contentOffset={{ x: containerWidth, y: 0 }}
        testID="month-calendar-scroll"
      >
        {months.map((month, index) => (
          <View key={index} style={{ width: containerWidth }}>
            <Calendar
              key={monthChangeKey}
              current={format(startOfMonth(month), 'yyyy-MM-dd')}
              markedDates={markedDates}
              onDayPress={handleDayPress}
              // 内部矢印・ヘッダーは非表示（カスタムヘッダーが担う）
              hideArrows={true}
              renderHeader={() => null}
              // スワイプは ScrollView が担うため無効化
              enableSwipeMonths={false}
              firstDay={1}
              maxDate={today}
              // 全月で6行表示を強制し、月ごとの高さ差をなくす
              showSixWeeks={true}
              theme={{
                // 曜日ヘッダー
                textSectionTitleColor: '#64748b',
                textDayHeaderFontSize: 11,
                textDayHeaderFontWeight: '600',
                // 日付セル
                dayTextColor: '#475569',
                textDayFontSize: 13,
                todayTextColor: '#4D94FF',
                todayBackgroundColor: 'transparent',
                // 選択状態
                selectedDayBackgroundColor: '#4D94FF',
                selectedDayTextColor: '#FFFFFF',
                // 無効状態
                textDisabledColor: '#cbd5e1',
                // 背景
                backgroundColor: '#f9fafb',
                calendarBackground: '#f9fafb',
              }}
              style={{ borderRadius: 12 }}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
  },
  arrowButton: {
    padding: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#64748b',
    lineHeight: 28,
  },
  arrowDisabled: {
    color: '#cbd5e1',
  },
});
