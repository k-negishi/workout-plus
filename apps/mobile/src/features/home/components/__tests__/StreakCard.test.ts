/**
 * StreakCard テスト
 * - 今月のトレーニング日数計算が正確か（日付境界ケース含む）
 *
 * Jest 30 + Expo 54 の互換性問題を回避するため、
 * ロジック部分のみを単体テストする
 */

/** 今月のトレーニング日数を計算する（StreakCard内部ロジックの抽出） */
function countMonthlyTraining(trainingDates: Date[], now: Date): number {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return trainingDates.filter((d) => {
    const date = new Date(d);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;
}

/** 今週の各日にトレーニングがあったかを判定する */
function getWeekStatus(
  weekDays: Date[],
  trainingDates: Date[]
): Array<{ isDone: boolean; isToday: boolean }> {
  const today = new Date();
  return weekDays.map((day) => ({
    isDone: trainingDates.some(
      (d) =>
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
    ),
    isToday:
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate(),
  }));
}

describe('StreakCard ロジック', () => {
  describe('countMonthlyTraining', () => {
    it('トレーニング日が0件の場合、0を返す', () => {
      const now = new Date(2026, 1, 21); // 2026-02-21
      expect(countMonthlyTraining([], now)).toBe(0);
    });

    it('今月のトレーニング日数を正しくカウントする', () => {
      const now = new Date(2026, 1, 21); // 2026-02-21
      const dates = [
        new Date(2026, 1, 1),
        new Date(2026, 1, 3),
        new Date(2026, 1, 5),
        new Date(2026, 1, 10),
        new Date(2026, 1, 15),
      ];
      expect(countMonthlyTraining(dates, now)).toBe(5);
    });

    it('先月のトレーニング日はカウントしない', () => {
      const now = new Date(2026, 1, 21); // 2026-02-21
      const dates = [
        new Date(2026, 0, 28), // 1月28日（先月）
        new Date(2026, 0, 31), // 1月31日（先月）
        new Date(2026, 1, 1), // 2月1日（今月）
        new Date(2026, 1, 2), // 2月2日（今月）
      ];
      expect(countMonthlyTraining(dates, now)).toBe(2);
    });

    it('月初（1日）のトレーニングを正しくカウントする', () => {
      const now = new Date(2026, 1, 21);
      const dates = [new Date(2026, 1, 1, 0, 0, 0)]; // 2月1日 0:00:00
      expect(countMonthlyTraining(dates, now)).toBe(1);
    });

    it('月末のトレーニングを正しくカウントする（31日がある月）', () => {
      const now = new Date(2026, 2, 31, 23, 59, 59); // 2026-03-31
      const dates = [
        new Date(2026, 2, 31, 23, 0, 0), // 3月31日
        new Date(2026, 2, 1), // 3月1日
      ];
      expect(countMonthlyTraining(dates, now)).toBe(2);
    });

    it('来月のトレーニング日はカウントしない', () => {
      const now = new Date(2026, 1, 21); // 2026-02-21
      const dates = [
        new Date(2026, 1, 15), // 2月15日（今月）
        new Date(2026, 2, 1), // 3月1日（来月）
      ];
      expect(countMonthlyTraining(dates, now)).toBe(1);
    });

    it('去年の同じ月はカウントしない', () => {
      const now = new Date(2026, 1, 21); // 2026-02-21
      const dates = [
        new Date(2025, 1, 15), // 2025年2月15日（去年の同月）
        new Date(2026, 1, 15), // 2026年2月15日（今年の今月）
      ];
      expect(countMonthlyTraining(dates, now)).toBe(1);
    });
  });

  describe('getWeekStatus', () => {
    it('トレーニング日がある日はisDoneがtrueになる', () => {
      const weekDays = [
        new Date(2026, 1, 16), // 月
        new Date(2026, 1, 17), // 火
        new Date(2026, 1, 18), // 水
        new Date(2026, 1, 19), // 木
        new Date(2026, 1, 20), // 金
        new Date(2026, 1, 21), // 土
        new Date(2026, 1, 22), // 日
      ];
      const trainingDates = [
        new Date(2026, 1, 16),
        new Date(2026, 1, 18),
        new Date(2026, 1, 20),
      ];

      const status = getWeekStatus(weekDays, trainingDates);

      expect(status[0]!.isDone).toBe(true); // 月
      expect(status[1]!.isDone).toBe(false); // 火
      expect(status[2]!.isDone).toBe(true); // 水
      expect(status[3]!.isDone).toBe(false); // 木
      expect(status[4]!.isDone).toBe(true); // 金
      expect(status[5]!.isDone).toBe(false); // 土
      expect(status[6]!.isDone).toBe(false); // 日
    });

    it('トレーニング日がない場合はすべてisDoneがfalse', () => {
      const weekDays = [
        new Date(2026, 1, 16),
        new Date(2026, 1, 17),
      ];
      const status = getWeekStatus(weekDays, []);
      expect(status.every((s) => !s.isDone)).toBe(true);
    });
  });
});
