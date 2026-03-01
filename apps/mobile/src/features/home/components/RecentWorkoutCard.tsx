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
import type { MuscleGroup, TimerStatus } from '@/types';

/** 部位の日本語ラベル */
const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  biceps: '二頭',
  triceps: '三頭',
  abs: '腹筋',
  other: 'その他',
};

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

/** 部位キー配列を日本語ラベルに変換して中黒区切りで返す */
function formatMuscleGroups(groups: string[]): string {
  return groups.map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g).join('・');
}

type RecentWorkoutCardProps = {
  /** ワークアウト完了日時（タイムスタンプ） */
  completedAt: number;
  /** 種目数 */
  exerciseCount: number;
  /** セット数 */
  setCount: number;
  /** 総ボリューム（kg） — タグ表示からは削除済みだが集計データとして保持 */
  totalVolume: number;
  /** 所要時間（秒） */
  durationSeconds: number | null;
  /** タイマー状態（discarded なら時間なし表示） */
  timerStatus?: TimerStatus;
  /** ワークアウトに含まれる部位の配列（表示とアイコン背景色に使用） */
  muscleGroups: string[];
  /** ワークアウトメモ（存在する場合のみ表示） */
  memo?: string | null;
  /** テスト用 ID */
  testID?: string;
  /** タップ時のコールバック */
  onPress: () => void;
};

export function RecentWorkoutCard({
  completedAt,
  exerciseCount,
  setCount,
  durationSeconds,
  timerStatus,
  muscleGroups,
  memo,
  testID,
  onPress,
}: RecentWorkoutCardProps) {
  // 日付フォーマット: 「2月18日(水)」
  const dateLabel = useMemo(() => {
    const date = new Date(completedAt);
    return format(date, 'M月d日(E)', { locale: ja });
  }, [completedAt]);

  // 部位ラベル: 「胸・背中」形式
  const muscleLabel = useMemo(
    () => (muscleGroups.length > 0 ? formatMuscleGroups(muscleGroups) : ''),
    [muscleGroups],
  );

  return (
    <Pressable style={styles.card} onPress={onPress} testID={testID}>
      {/* task-header: アイコン + info + バッジ（WF L655-660） */}
      <View style={styles.header}>
        {/* task-icon（WF L662-675） */}
        <View
          testID="task-icon"
          style={[styles.icon, { backgroundColor: getIconBackgroundColor(muscleGroups[0]) }]}
        >
          <Text style={styles.iconEmoji}>💪</Text>
        </View>

        {/* task-info（WF L677-692） */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            {/* 日付: 補助情報として小さく表示 */}
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            {/* 部位名: メイン情報として大きく表示 */}
            {muscleLabel !== '' && <Text style={styles.muscleLabel}>{muscleLabel}</Text>}
          </View>
        </View>

        {/* 完了バッジ（WF L551-560, L567-570） */}
        <View testID="status-badge" style={styles.badge}>
          <Text style={styles.badgeText}>完了</Text>
        </View>
      </View>

      {/* task-tags 行（WF L694-711）: 種目数・セット数・所要時間 */}
      <View style={styles.tags}>
        <View style={[styles.tag, { backgroundColor: colors.tagBlueBg }]}>
          <Text style={[styles.tagText, { color: colors.tagBlueText }]}>{exerciseCount}種目</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.tagYellowBg }]}>
          <Text style={[styles.tagText, { color: colors.tagYellowText }]}>{setCount}セット</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.tagPurpleBg }]}>
          <Text style={[styles.tagText, { color: colors.tagPurpleText }]}>
            {formatDuration(durationSeconds, timerStatus)}
          </Text>
        </View>
      </View>

      {/* ワークアウトメモ: 存在する場合のみタグ行の下に表示 */}
      {memo ? (
        <Text testID="workout-card-memo" style={styles.memo} numberOfLines={2}>
          {memo}
        </Text>
      ) : null}
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
  titleRow: {
    // 日付と部位名を縦並びで表示
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  // 日付: 補助情報として部位名より小さく
  dateLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  // 部位名: メイン情報として大きく・太く
  muscleLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
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
  // ワークアウトメモ: タグ行の下にグレーで表示
  memo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
});
