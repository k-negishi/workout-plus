/**
 * MonthCalendar - カレンダーコンポーネント
 * react-native-calendarsを使用
 * トレーニング日: 青ドットマーカー(#4D94FF)
 * 前後月ナビゲーション、フリックジェスチャー対応、未来日タップ無効
 */
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
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

type MonthCalendarProps = {
  /** トレーニングした日付のリスト */
  trainingDates: Date[];
  /** 選択中の日付 */
  selectedDate: string | null;
  /** 日付タップ時のコールバック */
  onDayPress: (dateString: string) => void;
  /** 月変更時のコールバック */
  onMonthChange?: (dateString: string) => void;
};

export function MonthCalendar({
  trainingDates,
  selectedDate,
  onDayPress,
  onMonthChange,
}: MonthCalendarProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // 表示月を内部状態で管理する（フリックおよび矢印ボタンで更新される）
  // startOfMonth で月の初日に正規化することで addMonths/subMonths が一貫した値を返す
  const [displayMonth, _setDisplayMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));

  // PanResponder コールバック内で displayMonth の最新値を参照するための ref
  // stale closure を防ぐため state と並行して管理する
  const displayMonthRef = useRef(displayMonth);

  // 親コンポーネントの onMonthChange コールバックを ref で保持（stale closure 対策）
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;

  // displayMonth を state と ref の両方に反映するヘルパー
  const setDisplayMonth = useCallback((newMonth: string) => {
    displayMonthRef.current = newMonth;
    _setDisplayMonth(newMonth);
  }, []);

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
    // react-native-calendars は実行時にカレンダー内部で todayTextColor を参照する。
    // 型安全を担保しつつ実装するため unknown 経由でキャストする。
    if (!selectedDate || selectedDate !== today) {
      marks[today] = {
        ...(marks[today] ?? {}),
        ...(marks[today]?.marked ? {} : {}),
        todayTextColor: '#4D94FF',
      } as (typeof marks)[string];
    }

    return marks;
  }, [trainingDates, selectedDate, today]);

  // 日付タップハンドラ（未来日は無効）
  const handleDayPress = useCallback(
    (day: DateData) => {
      // 'yyyy-MM-dd' 文字列を UTC ではなくローカル日付として安全に解釈するため、
      // split で分解してローカル時刻として Date を生成する
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

  // 矢印ボタンの月変更ハンドラ: displayMonthRef と state を同期して常に最新の基準月を保つ
  const handleMonthChange = useCallback(
    (month: DateData) => {
      setDisplayMonth(month.dateString);
      onMonthChangeRef.current?.(month.dateString);
    },
    [setDisplayMonth],
  );

  // フリックジェスチャーで前後月を移動する PanResponder
  // displayMonth は ref 経由で参照するため依存配列は空でよい（stale closure なし）
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 水平方向の移動が垂直方向より大きい場合のみ PanResponder がタッチを取得する
        // → ScrollView の縦スクロールとの共存を実現する
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
        onPanResponderRelease: (_, { dx, dy }) => {
          // 縦スクロールが支配的な場合は無視（onMoveShouldSetPanResponder の二重チェック）
          if (Math.abs(dx) <= Math.abs(dy)) return;

          if (dx > 50) {
            // 右フリック: 前月へ
            const prev = format(subMonths(parseISO(displayMonthRef.current), 1), 'yyyy-MM-dd');
            setDisplayMonth(prev);
            onMonthChangeRef.current?.(prev);
          } else if (dx < -50) {
            // 左フリック: 翌月へ（当月より未来への移動は不可）
            const next = addMonths(parseISO(displayMonthRef.current), 1);
            if (!isAfter(next, startOfMonth(new Date()))) {
              const nextStr = format(next, 'yyyy-MM-dd');
              setDisplayMonth(nextStr);
              onMonthChangeRef.current?.(nextStr);
            }
          }
        },
      }),
    // PanResponder は一度だけ生成する（displayMonth は ref 経由で参照するため dep に不要）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    // フリックジェスチャーを受け取るラッパー View
    <View {...panResponder.panHandlers}>
      <Calendar
        current={displayMonth}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        firstDay={1}
        maxDate={today}
        theme={{
          // ヘッダー
          monthTextColor: '#334155',
          textMonthFontSize: 20,
          textMonthFontWeight: '700',
          arrowColor: '#64748b',
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
        style={{
          borderRadius: 12,
        }}
      />
    </View>
  );
}
