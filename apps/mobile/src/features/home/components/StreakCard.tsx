/**
 * StreakCard - 今月のトレーニング日数と週間カレンダー
 * ワイヤーフレーム: streak-card セクション準拠
 */
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

/** チェックマークアイコン */
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3}>
      <Path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 炎アイコン（ストリーク用） */
function FireIcon() {
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4D94FF"
      strokeWidth={1.5}
      opacity={0.7}
    >
      <Path
        d="M12 22c4.97 0 8-3.58 8-8 0-3.5-2-6.5-4-8.5-1 2-2.5 3-4 3-1.5-2.5-1-5.5 1-8C9.5 2 5 6.5 4 10c-.5 2-.5 4 0 5 .5 1.5 1.5 3 3 4.5S10 22 12 22z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 曜日ラベル（月〜日） */
const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

type StreakCardProps = {
  /** トレーニングした日付のリスト（Date[] または number[] タイムスタンプ） */
  trainingDates: Date[];
};

export function StreakCard({ trainingDates }: StreakCardProps) {
  // 今月のトレーニング日数を計算
  const monthlyCount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return trainingDates.filter((d) => {
      const date = new Date(d);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  }, [trainingDates]);

  // 今週の日付リスト（月曜始まり）
  const weekDays = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, []);

  // 今週の各日にトレーニングがあったかを判定
  const weekStatus = useMemo(() => {
    return weekDays.map((day) => ({
      date: day,
      label: format(day, 'E', { locale: ja }).charAt(0),
      isDone: trainingDates.some((d) => isSameDay(new Date(d), day)),
      isToday: isToday(day),
    }));
  }, [weekDays, trainingDates]);

  return (
    <View
      className="rounded-lg p-3.5 px-4"
      style={{
        backgroundColor: 'rgba(77, 148, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(77, 148, 255, 0.15)',
      }}
    >
      {/* 上部: 今月の日数 + 炎アイコン */}
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-xs text-primary" style={{ opacity: 0.85 }}>
            今月のトレーニング
          </Text>
          <View className="flex-row items-end mt-1">
            <Text className="text-[34px] font-bold leading-none" style={{ color: '#3385FF' }}>
              {monthlyCount}
            </Text>
            <Text className="text-sm text-primary ml-0.5">日</Text>
          </View>
        </View>
        <FireIcon />
      </View>

      {/* 週間カレンダー */}
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        {weekStatus.map((day, index) => (
          <View key={index} className="flex-1 items-center" style={{ gap: 4 }}>
            {/* 曜日の丸 */}
            <View
              className="w-7 h-7 rounded-full items-center justify-center"
              style={{
                backgroundColor: day.isDone ? '#4D94FF' : 'rgba(77, 148, 255, 0.10)',
                ...(day.isToday && !day.isDone ? { borderWidth: 2, borderColor: '#4D94FF' } : {}),
              }}
            >
              {day.isDone ? <CheckIcon /> : null}
            </View>
            {/* 曜日ラベル */}
            <Text className="text-primary" style={{ fontSize: 12, opacity: 0.7 }}>
              {DAY_LABELS[index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
