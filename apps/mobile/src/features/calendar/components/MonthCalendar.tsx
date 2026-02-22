/**
 * MonthCalendar - カレンダーコンポーネント
 * react-native-calendarsを使用
 * トレーニング日: 青ドットマーカー(#4D94FF)
 * 前後月ナビゲーション、未来日タップ無効
 */
import { format, isBefore, startOfDay } from 'date-fns';
import { useCallback, useMemo } from 'react';
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
    if (!selectedDate || selectedDate !== today) {
      marks[today] = {
        ...(marks[today] ?? {}),
        ...(marks[today]?.marked ? {} : {}),
        todayTextColor: '#4D94FF',
      };
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

  // 月変更ハンドラ
  const handleMonthChange = useCallback(
    (month: DateData) => {
      onMonthChange?.(month.dateString);
    },
    [onMonthChange],
  );

  return (
    <Calendar
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
  );
}
