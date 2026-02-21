/**
 * RecentWorkoutCard - 最近のワークアウトカード
 * ワイヤーフレーム: task-card セクション準拠
 * 日時・種目数/セット数・総ボリューム・所要時間を表示
 */
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Circle, Path, Svg } from 'react-native-svg';

/** 時計アイコン */
function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** ダンベルアイコン */
function DumbbellIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
      <Path
        d="M6 7v10M18 7v10M2 9v6M22 9v6M6 12h12M2 12h4M18 12h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 秒数を「Xh Xm」形式に変換する */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

/** 重量を見やすくフォーマットする */
function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toLocaleString()}kg`;
}

type RecentWorkoutCardProps = {
  /** ワークアウト完了日時（タイムスタンプ） */
  completedAt: number;
  /** 種目数 */
  exerciseCount: number;
  /** セット数 */
  setCount: number;
  /** 総ボリューム（kg） */
  totalVolume: number;
  /** 所要時間（秒） */
  durationSeconds: number;
  /** タップ時のコールバック */
  onPress: () => void;
};

export function RecentWorkoutCard({
  completedAt,
  exerciseCount,
  setCount,
  totalVolume,
  durationSeconds,
  onPress,
}: RecentWorkoutCardProps) {
  // 日付フォーマット: 「2/21 土曜日」
  const dateLabel = useMemo(() => {
    const date = new Date(completedAt);
    return format(date, 'M/d EEEE', { locale: ja });
  }, [completedAt]);

  return (
    <Pressable
      className="bg-white rounded-lg p-4 mb-3"
      style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
      onPress={onPress}
    >
      {/* 日付 */}
      <Text className="text-[15px] font-semibold mb-3" style={{ color: '#334155' }}>
        {dateLabel}
      </Text>

      {/* タグ行 */}
      <View className="flex-row mb-2" style={{ gap: 6 }}>
        <View className="px-2 py-1 rounded-sm" style={{ backgroundColor: '#fef3c7' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>
            {setCount}セット
          </Text>
        </View>
        <View className="px-2 py-1 rounded-sm" style={{ backgroundColor: '#dbeafe' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1e40af' }}>
            {formatWeight(totalVolume)}
          </Text>
        </View>
        <View className="px-2 py-1 rounded-sm" style={{ backgroundColor: '#f3e8ff' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b21a8' }}>
            {formatDuration(durationSeconds)}
          </Text>
        </View>
      </View>

      {/* フッター: 統計 */}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <DumbbellIcon />
          <Text className="text-xs text-text-secondary">{exerciseCount}種目</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <ClockIcon />
          <Text className="text-xs text-text-secondary">{formatDuration(durationSeconds)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
