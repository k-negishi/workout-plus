/**
 * MonthCalendar テスト
 * - ドットマーカーが正しい日付に表示されるか
 * - 未来日の判定
 *
 * Jest 30 + Expo 54 の互換性問題を回避するため、
 * マーカー生成ロジックのみを単体テストする
 */
import { format, isBefore, startOfDay } from 'date-fns';

/** マーカーデータ生成ロジック（MonthCalendar内部ロジックの抽出） */
type MarkedDateEntry = {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  todayTextColor?: string;
};

function generateMarkedDates(
  trainingDates: Date[],
  selectedDate: string | null,
  today: string,
): Record<string, MarkedDateEntry> {
  const marks: Record<string, MarkedDateEntry> = {};

  // トレーニング日にドットマーカーを追加
  for (const date of trainingDates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    marks[dateStr] = {
      ...(marks[dateStr] ?? {}),
      marked: true,
      dotColor: '#4D94FF',
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
      todayTextColor: '#4D94FF',
    };
  }

  return marks;
}

/** 未来日判定ロジック */
function isFutureDate(dateString: string, todayDate: Date): boolean {
  const selected = new Date(dateString);
  const endOfToday = new Date(startOfDay(todayDate).getTime() + 86400000);
  return !isBefore(selected, endOfToday);
}

describe('MonthCalendar ロジック', () => {
  describe('generateMarkedDates', () => {
    const today = '2026-02-21';

    it('トレーニング日のマーカーが正しく設定される', () => {
      const trainingDates = [new Date(2026, 1, 1), new Date(2026, 1, 5), new Date(2026, 1, 10)];

      const marks = generateMarkedDates(trainingDates, null, today);

      expect(marks['2026-02-01']).toBeDefined();
      expect(marks['2026-02-01']!.marked).toBe(true);
      expect(marks['2026-02-01']!.dotColor).toBe('#4D94FF');

      expect(marks['2026-02-05']).toBeDefined();
      expect(marks['2026-02-05']!.marked).toBe(true);

      expect(marks['2026-02-10']).toBeDefined();
      expect(marks['2026-02-10']!.marked).toBe(true);
    });

    it('選択日に選択スタイルが適用される', () => {
      const marks = generateMarkedDates([], '2026-02-15', today);

      expect(marks['2026-02-15']).toBeDefined();
      expect(marks['2026-02-15']!.selected).toBe(true);
      expect(marks['2026-02-15']!.selectedColor).toBe('#4D94FF');
    });

    it('トレーニング日かつ選択日の場合、両方のスタイルが適用される', () => {
      const trainingDates = [new Date(2026, 1, 15)];

      const marks = generateMarkedDates(trainingDates, '2026-02-15', today);

      expect(marks['2026-02-15']!.marked).toBe(true);
      expect(marks['2026-02-15']!.selected).toBe(true);
      expect(marks['2026-02-15']!.dotColor).toBe('#4D94FF');
    });

    it('トレーニングしていない日にはマーカーが付かない', () => {
      const trainingDates = [new Date(2026, 1, 1)];

      const marks = generateMarkedDates(trainingDates, null, today);

      // 2月2日にはマーカーがないこと（todayのエントリのみ）
      expect(marks['2026-02-02']).toBeUndefined();
    });

    it('今日の日付にtodayTextColorが設定される（未選択時）', () => {
      const marks = generateMarkedDates([], null, today);

      expect(marks[today]).toBeDefined();
      expect(marks[today]!.todayTextColor).toBe('#4D94FF');
    });

    it('今日が選択日の場合、todayTextColorは設定されない', () => {
      const marks = generateMarkedDates([], today, today);

      // selectedは付くがtodayTextColorは付かない
      expect(marks[today]!.selected).toBe(true);
      expect(marks[today]!.todayTextColor).toBeUndefined();
    });
  });

  describe('isFutureDate', () => {
    const todayDate = new Date(2026, 1, 21); // 2026-02-21

    it('過去の日付はfalseを返す', () => {
      expect(isFutureDate('2026-02-15', todayDate)).toBe(false);
    });

    it('今日の日付はfalseを返す', () => {
      expect(isFutureDate('2026-02-21', todayDate)).toBe(false);
    });

    it('明日の日付はtrueを返す', () => {
      expect(isFutureDate('2026-02-22', todayDate)).toBe(true);
    });

    it('来月の日付はtrueを返す', () => {
      expect(isFutureDate('2026-03-01', todayDate)).toBe(true);
    });
  });
});
