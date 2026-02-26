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

export type MonthCalendarProps = {
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

  // onLayout で取得したコンテナ幅。初期値 0 で、onLayout 計測後に正確な値をセットする。
  // 計測完了まで ScrollView を描画しないことで、サイズずれフラッシュを防ぐ (#171)
  const [containerWidth, setContainerWidth] = useState(0);

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

  // ScrollView を中央（index 1）にスナップしてアニメーション状態をリセットする。
  // setDisplayMonth・setMonthChangeKey・onMonthChange は呼び出し側が担い、
  // このコールバックはスクロール位置とフラグのみ管理する。
  // setTimeout(0) は setDisplayMonth の React commit を待ってから scrollTo するために必要
  // （commit 前だと months[] が古く、中央パネルが意図しない月になる）
  const resetToCenter = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: containerWidthRef.current, animated: false });
      setIsAnimating(false);
      isAnimatingRef.current = false;
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
        isAnimatingRef.current = true;
        const newMonth = subMonths(displayMonthRef.current, 1);
        // setDisplayMonth・onMonthChange・setMonthChangeKey を同一同期ブロックで呼ぶことで
        // React 18 の自動バッチングにより1回のレンダーで確定し、1日の青丸が即座に表示される
        setDisplayMonth(newMonth);
        onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
        setMonthChangeKey((prev) => prev + 1);
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
        setMonthChangeKey((prev) => prev + 1);
        resetToCenter();
      }
      // index === 1: 中央のまま（何もしない）
    },
    [isNextMonthDisabled, resetToCenter],
  );

  // 前月ボタン: アニメーション開始前に onMonthChange を即座に呼ぶ
  //
  // なぜ開始前か:
  // onMonthChange を先に呼ぶと CalendarScreen が selectedDate を新しい月の1日に更新し、
  // markedDates が即座に再計算される。これにより:
  //   - 前月（スライドアウト中）の青丸が消える
  //   - 新しい月（スライドイン中）の1日が青丸付きで表示される
  // アニメーション完了後は setDisplayMonth + setMonthChangeKey のみ処理する
  const handlePrevMonth = useCallback(() => {
    if (isAnimatingRef.current) return;
    const newMonth = subMonths(displayMonthRef.current, 1);
    // アニメーション前に親へ通知 → markedDates が即座に更新され、アニメーション中から正しい状態に
    onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
    isAnimatingRef.current = true;
    setIsAnimating(true);

    scrollViewRef.current?.scrollTo({ x: 0, animated: true });

    setTimeout(() => {
      // setDisplayMonth + setMonthChangeKey を同一バッチで処理
      // → months[] 更新と Calendar リマウントが1レンダーで完結
      setDisplayMonth(newMonth);
      setMonthChangeKey((prev) => prev + 1);
      resetToCenter();
    }, ANIMATION_DURATION_MS);
  }, [resetToCenter]);

  // 翌月ボタン: 同じく開始前に onMonthChange を呼ぶ
  const handleNextMonth = useCallback(() => {
    if (isAnimatingRef.current || isNextMonthDisabled) return;
    const newMonth = addMonths(displayMonthRef.current, 1);
    onMonthChangeRef.current?.(format(startOfMonth(newMonth), 'yyyy-MM-dd'));
    isAnimatingRef.current = true;
    setIsAnimating(true);

    scrollViewRef.current?.scrollTo({
      x: containerWidthRef.current * 2,
      animated: true,
    });

    setTimeout(() => {
      setDisplayMonth(newMonth);
      setMonthChangeKey((prev) => prev + 1);
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
    <View
      onLayout={handleLayout}
      testID="calendar-container"
      style={{ marginBottom: -16, overflow: 'hidden' }}
    >
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

      {/* 3パネルScrollView: onLayout で幅計測完了後にマウントする (#171)
          計測前は描画しないことで、初期幅と実測幅のずれによるフラッシュを原理的に防止する。
          ヘッダーは常に表示されるため体感的な遅延はない（onLayout は最初のフレームで発火する） */}
      {containerWidth > 0 && (
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
      )}
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
