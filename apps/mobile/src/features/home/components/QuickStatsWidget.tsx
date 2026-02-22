/**
 * QuickStatsWidget - 2x2グリッドのダッシュボードウィジェット
 * ワイヤーフレーム: widgets-grid セクション準拠
 * 4カード: 今月のワークアウト回数 / 今週の回数 / 月間総ボリューム / 最長ストリーク
 */
import { Text, View } from 'react-native';
import { Circle, Line, Path, Polyline, Svg } from 'react-native-svg';

import { colors } from '@/shared/constants/colors';

/** ターゲットアイコン（今月のワークアウト） */
function TargetIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2}>
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={12} cy={12} r={6} />
      <Circle cx={12} cy={12} r={2} />
    </Svg>
  );
}

/** カレンダーアイコン（今週の回数） */
function CalendarIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2}>
      <Path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
      <Line x1={16} y1={2} x2={16} y2={6} />
      <Line x1={8} y1={2} x2={8} y2={6} />
      <Line x1={3} y1={10} x2={21} y2={10} />
    </Svg>
  );
}

/** トロフィーアイコン（最長ストリーク） */
function TrophyIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2}>
      <Path
        d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M6 3h12v6a6 6 0 11-12 0V3zM9 21h6M12 15v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** チャートアイコン（月間総ボリューム） */
function ChartIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2}>
      <Polyline
        points="22 12 18 12 15 21 9 3 6 12 2 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** ウィジェットアイコンの背景色 */
const ICON_BG_COLORS = {
  target: colors.primaryBg,
  calendar: colors.primaryBgMedium,
  trophy: colors.primaryBgStrong,
  chart: colors.primaryBgDeep,
} as const;

/** 重量を見やすくフォーマットする */
function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toLocaleString()}kg`;
}

type QuickStatsWidgetProps = {
  /** 今月のワークアウト回数 */
  monthlyWorkouts: number;
  /** 今週のワークアウト回数 */
  weeklyWorkouts: number;
  /** 月間総ボリューム（kg） */
  monthlyVolume: number;
  /** 最長ストリーク（連続日数） */
  longestStreak: number;
};

/** 個別ウィジェットカード */
function WidgetCard({
  icon,
  iconBg,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  subtitle?: string;
}) {
  // flex: 1 で同一行の兄弟カードと高さを揃える
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      {/* ヘッダー: アイコン + タイトル */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: iconBg }}
        >
          {icon}
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{title}</Text>
      </View>

      {/* 値 */}
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 4, color: colors.textPrimary }}>
        {value}
      </Text>

      {/* サブタイトル */}
      {subtitle ? <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text> : null}
    </View>
  );
}

export function QuickStatsWidget({
  monthlyWorkouts,
  weeklyWorkouts,
  monthlyVolume,
  longestStreak,
}: QuickStatsWidgetProps) {
  return (
    <View>
      {/* 2x2グリッド */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <WidgetCard
            icon={<TargetIcon />}
            iconBg={ICON_BG_COLORS.target}
            title="今月"
            value={`${monthlyWorkouts}`}
            subtitle="ワークアウト"
          />
        </View>
        <View style={{ flex: 1 }}>
          <WidgetCard
            icon={<CalendarIcon />}
            iconBg={ICON_BG_COLORS.calendar}
            title="今週"
            value={`${weeklyWorkouts}`}
            subtitle="ワークアウト"
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <WidgetCard
            icon={<ChartIcon />}
            iconBg={ICON_BG_COLORS.chart}
            title="月間ボリューム"
            value={formatVolume(monthlyVolume)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <WidgetCard
            icon={<TrophyIcon />}
            iconBg={ICON_BG_COLORS.trophy}
            title="最長ストリーク"
            value={`${longestStreak}`}
            subtitle="日連続"
          />
        </View>
      </View>
    </View>
  );
}
