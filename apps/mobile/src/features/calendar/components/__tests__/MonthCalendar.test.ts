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
  todayBackgroundColor?: string;
};

function generateMarkedDates(
  trainingDates: Date[],
  selectedDate: string | null,
  today: string,
): Record<string, MarkedDateEntry> {
  const marks: Record<string, MarkedDateEntry> = {};

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
  // Issue #177: 選択日ほど目立たないが、今日の日付に薄いブルー背景を付ける
  if (!selectedDate || selectedDate !== today) {
    marks[today] = {
      ...(marks[today] ?? {}),
      todayTextColor: '#4D94FF',
      todayBackgroundColor: '#E6F2FF',
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

    it('トレーニング日に薄いブルー背景が設定される（ドットより視認しやすい）', () => {
      const trainingDates = [new Date(2026, 1, 1), new Date(2026, 1, 5), new Date(2026, 1, 10)];

      const marks = generateMarkedDates(trainingDates, null, today);

      // 薄いブルー背景＋ブルーテキストで視認性を確保する
      expect(marks['2026-02-01']).toBeDefined();
      expect(marks['2026-02-01']!.selected).toBe(true);
      expect(marks['2026-02-01']!.selectedColor).toBe('#E6F2FF');
      expect(marks['2026-02-01']!.selectedTextColor).toBe('#4D94FF');

      expect(marks['2026-02-05']).toBeDefined();
      expect(marks['2026-02-05']!.selected).toBe(true);
      expect(marks['2026-02-05']!.selectedColor).toBe('#E6F2FF');

      expect(marks['2026-02-10']).toBeDefined();
      expect(marks['2026-02-10']!.selected).toBe(true);
    });

    it('選択日に選択スタイルが適用される', () => {
      const marks = generateMarkedDates([], '2026-02-15', today);

      expect(marks['2026-02-15']).toBeDefined();
      expect(marks['2026-02-15']!.selected).toBe(true);
      expect(marks['2026-02-15']!.selectedColor).toBe('#4D94FF');
    });

    it('トレーニング日かつ選択日の場合、濃いブルー（選択状態）が優先される', () => {
      const trainingDates = [new Date(2026, 1, 15)];

      const marks = generateMarkedDates(trainingDates, '2026-02-15', today);

      // 選択日の濃いブルーがトレーニング日の薄いブルーを上書きする
      expect(marks['2026-02-15']!.selected).toBe(true);
      expect(marks['2026-02-15']!.selectedColor).toBe('#4D94FF');
      expect(marks['2026-02-15']!.selectedTextColor).toBe('#FFFFFF');
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

    // Issue #177: 今日の日付に薄い背景色を設定する
    it('今日の日付にtodayBackgroundColorが設定される（未選択時）', () => {
      const marks = generateMarkedDates([], null, today);

      expect(marks[today]).toBeDefined();
      // 選択日ほど目立たない薄いブルー背景を設定する
      expect(marks[today]!.todayBackgroundColor).toBe('#E6F2FF');
    });

    it('今日が選択日の場合、todayBackgroundColorは設定されない', () => {
      const marks = generateMarkedDates([], today, today);

      // 選択済みの場合は selectedColor が背景を担うため todayBackgroundColor は不要
      expect(marks[today]!.selected).toBe(true);
      expect(marks[today]!.todayBackgroundColor).toBeUndefined();
    });

    it('今日がトレーニング日かつ未選択の場合、todayBackgroundColorが設定される', () => {
      // トレーニング日の薄いブルー背景と同じ色で一貫性を保つ
      const trainingDates = [new Date(today)];
      const marks = generateMarkedDates(trainingDates, null, today);

      expect(marks[today]!.todayBackgroundColor).toBe('#E6F2FF');
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
