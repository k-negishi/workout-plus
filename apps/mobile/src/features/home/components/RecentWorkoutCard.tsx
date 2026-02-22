/**
 * RecentWorkoutCard - 最近のワークアウトカード
 * ワイヤーフレーム: task-card セクション準拠（WF L646-711）
 * task-header（アイコン+バッジ）、task-info、task-tags 構造
 */
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';
import type { TimerStatus } from '@/types';

/** 秒数を「X時間X分」形式に変換する */
function formatDuration(seconds: number | null, timerStatus?: TimerStatus): string {
  if (timerStatus === 'discarded' || seconds == null) {
    return '―';
  }
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

/** 部位別アイコン背景色（WF L673-675） */
function getIconBackgroundColor(muscleGroup?: string): string {
  switch (muscleGroup) {
    case 'chest':
      return colors.primaryBg;
    case 'back':
      return colors.primaryBgMedium;
    case 'legs':
      return colors.primaryBgStrong;
    default:
      return colors.neutralBg;
  }
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
  durationSeconds: number | null;
  /** タイマー状態（discarded なら時間なし表示） */
  timerStatus?: TimerStatus;
  /** 主要部位（アイコン背景色の決定に使用） */
  primaryMuscleGroup?: string;
  /** タップ時のコールバック */
  onPress: () => void;
};

export function RecentWorkoutCard({
  completedAt,
  exerciseCount,
  setCount,
  totalVolume,
  durationSeconds,
  timerStatus,
  primaryMuscleGroup,
  onPress,
}: RecentWorkoutCardProps) {
  // 日付フォーマット: 「2/21 土曜日」
  const dateLabel = useMemo(() => {
    const date = new Date(completedAt);
    return format(date, 'M/d EEEE', { locale: ja });
  }, [completedAt]);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* task-header: アイコン + info + バッジ（WF L655-660） */}
      <View style={styles.header}>
        {/* task-icon（WF L662-675） */}
        <View
          testID="task-icon"
          style={[styles.icon, { backgroundColor: getIconBackgroundColor(primaryMuscleGroup) }]}
        >
          <Text style={styles.iconEmoji}>💪</Text>
        </View>

        {/* task-info（WF L677-692） */}
        <View style={styles.info}>
          <Text style={styles.title}>{dateLabel}</Text>
          <Text style={styles.subtitle}>{exerciseCount}種目</Text>
        </View>

        {/* 完了バッジ（WF L551-560, L567-570） */}
        <View testID="status-badge" style={styles.badge}>
          <Text style={styles.badgeText}>完了</Text>
        </View>
      </View>

      {/* task-tags 行（WF L694-711） */}
      <View style={styles.tags}>
        <View style={[styles.tag, { backgroundColor: colors.tagYellowBg }]}>
          <Text style={[styles.tagText, { color: colors.tagYellowText }]}>{setCount}セット</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.tagBlueBg }]}>
          <Text style={[styles.tagText, { color: colors.tagBlueText }]}>
            {formatWeight(totalVolume)}
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.tagPurpleBg }]}>
          <Text style={[styles.tagText, { color: colors.tagPurpleText }]}>
            {formatDuration(durationSeconds, timerStatus)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // カードコンテナ（WF L646-653 .task-card）
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // task-header（WF L655-660）
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  // task-icon（WF L662-675）
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  // task-info（WF L677-692）
  info: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  // 完了バッジ（WF L551-560, L567-570）
  badge: {
    backgroundColor: '#cce5ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // task-tags 行（WF L694-711）
  tags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  // タグ共通（WF L701-707）
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
