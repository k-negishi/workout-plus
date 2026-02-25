/**
 * MonthCalendar - カレンダーコンポーネント
 * react-native-calendarsを使用
 * トレーニング日: 青ドットマーカー(#4D94FF)
 * 前後月ナビゲーション、enableSwipeMonths対応、未来日タップ無効
 *
 * スワイプ実装について:
 * react-native-gesture-handler の Gesture.Pan() を外側からラップする方式は iOS で動作しない。
 * 理由: GestureDetector がネイティブ側でタッチを先取りし、Calendar 内部の
 * GestureRecognizer (react-native-swipe-gestures) が起動できなくなるため。
 * Calendar 標準の enableSwipeMonths={true} を使うことで、ライブラリが内部で
 * 正しくスワイプを処理する（maxDate・onMonthChange も自動的に尊重される）。
 */
import { format, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
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

  // 表示月を内部状態で管理する（矢印ボタン・スワイプで更新される）
  // startOfMonth で月の初日に正規化することで一貫した値を返す
  const [displayMonth, setDisplayMonth] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  );

  // 親コンポーネントの onMonthChange コールバックを ref で保持（stale closure 対策）
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;

  // マーキングデータを生成
  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};

    // トレーニング日に薄いブルー背景を設定（ドットより視認しやすい）
    for (const date of trainingDates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      marks[dateStr] = {
        ...(marks[dateStr] ?? {}),
        selected: true,
        selectedColor: '#93C5FD',
        selectedTextColor: '#1D4ED8',
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

  // 矢印ボタン・スワイプの月変更ハンドラ
  // enableSwipeMonths={true} により Calendar 内部のスワイプも onMonthChange を呼ぶ
  const handleMonthChange = useCallback((month: DateData) => {
    setDisplayMonth(month.dateString);
    onMonthChangeRef.current?.(month.dateString);
  }, []);

  return (
    <View>
      <Calendar
        current={displayMonth}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        // react-native-calendars 内蔵のスワイプ機能を有効化（iOS/Android 両対応）
        // 内部実装: GestureRecognizer (react-native-swipe-gestures) で Calendar をラップ
        // → onPressLeft/Right を呼ぶため maxDate・onMonthChange が自動的に尊重される
        enableSwipeMonths={true}
        firstDay={1}
        maxDate={today}
        // 「2月 2026」→「2026年2月」形式にする（Issue #161）
        renderHeader={(date) => {
          const d = date instanceof Date ? date : new Date(String(date));
          return (
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#334155' }}>
              {d.getFullYear()}年{d.getMonth() + 1}月
            </Text>
          );
        }}
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
