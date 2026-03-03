/**
 * SettingsScreen - 設定画面
 *
 * 3セクション構成:
 * 1. ワークアウト: 週の目標（ステッパー [−] N回 [+]）
 * 2. データ管理: インポート・エクスポート（準備中）
 * 3. その他: 利用規約・プライバシーポリシー（準備中）・バージョン
 *
 * Issue #169
 */
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserSettingsRepository } from '@/database/repositories/userSettings';
import { colors } from '@/shared/constants/colors';

/** アプリバージョン（expo-constants から取得） */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** 週の目標の最小・最大値 */
const MIN_GOAL = 1;
const MAX_GOAL = 7;

// ---- 共通スタイル定数 -------------------------------------------------------

const SECTION_TITLE_STYLE = {
  fontSize: 12,
  fontWeight: '600' as const,
  color: colors.textSecondary,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  paddingHorizontal: 20,
  paddingTop: 24,
  paddingBottom: 8,
};

const CARD_STYLE = {
  backgroundColor: colors.white,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border,
};

const ROW_STYLE = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingHorizontal: 20,
  paddingVertical: 14,
  minHeight: 50,
};

const ROW_LABEL_STYLE = {
  fontSize: 16,
  color: colors.textPrimary,
};

const ROW_DIVIDER_STYLE = {
  height: 1,
  backgroundColor: colors.border,
  marginLeft: 20,
};

// ---- 準備中バッジ -----------------------------------------------------------

function ComingSoonBadge() {
  return (
    <View
      style={{
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>準備中</Text>
    </View>
  );
}

// ---- メインコンポーネント ---------------------------------------------------

export function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [weeklyGoalCount, setWeeklyGoalCount] = useState(3);

  // 画面フォーカス時に設定を取得する
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const settings = await UserSettingsRepository.get();
        setWeeklyGoalCount(settings.weeklyGoalCount);
      })();
    }, []),
  );

  // 週の目標を増減して即時保存する
  const handleDecrement = useCallback(() => {
    if (weeklyGoalCount <= MIN_GOAL) return;
    const next = weeklyGoalCount - 1;
    setWeeklyGoalCount(next);
    void UserSettingsRepository.setWeeklyGoalCount(next);
  }, [weeklyGoalCount]);

  const handleIncrement = useCallback(() => {
    if (weeklyGoalCount >= MAX_GOAL) return;
    const next = weeklyGoalCount + 1;
    setWeeklyGoalCount(next);
    void UserSettingsRepository.setWeeklyGoalCount(next);
  }, [weeklyGoalCount]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ヘッダー */}
      <View
        style={{
          backgroundColor: colors.white,
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>設定</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- セクション1: ワークアウト ---- */}
        <Text style={SECTION_TITLE_STYLE}>ワークアウト</Text>
        <View style={CARD_STYLE}>
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>週の目標</Text>
            {/* [−] N回 [+] ステッパー */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                testID="stepper-decrement"
                accessibilityLabel="週の目標を減らす"
                accessibilityState={{ disabled: weeklyGoalCount <= MIN_GOAL }}
                onPress={handleDecrement}
                disabled={weeklyGoalCount <= MIN_GOAL}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: weeklyGoalCount <= MIN_GOAL ? colors.border : colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    color: weeklyGoalCount <= MIN_GOAL ? colors.textSecondary : colors.primary,
                    lineHeight: 24,
                  }}
                >
                  −
                </Text>
              </Pressable>

              <Text
                testID="stepper-count"
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  minWidth: 36,
                  textAlign: 'center',
                }}
              >
                {weeklyGoalCount}回
              </Text>

              <Pressable
                testID="stepper-increment"
                accessibilityLabel="週の目標を増やす"
                accessibilityState={{ disabled: weeklyGoalCount >= MAX_GOAL }}
                onPress={handleIncrement}
                disabled={weeklyGoalCount >= MAX_GOAL}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: weeklyGoalCount >= MAX_GOAL ? colors.border : colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    color: weeklyGoalCount >= MAX_GOAL ? colors.textSecondary : colors.primary,
                    lineHeight: 24,
                  }}
                >
                  ＋
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ---- セクション2: データ管理 ---- */}
        <Text style={SECTION_TITLE_STYLE}>データ管理</Text>
        <View style={CARD_STYLE}>
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>データインポート</Text>
            <ComingSoonBadge />
          </View>
          <View style={ROW_DIVIDER_STYLE} />
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>データエクスポート</Text>
            <ComingSoonBadge />
          </View>
        </View>

        {/* ---- セクション3: その他 ---- */}
        <Text style={SECTION_TITLE_STYLE}>その他</Text>
        <View style={CARD_STYLE}>
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>利用規約</Text>
            <ComingSoonBadge />
          </View>
          <View style={ROW_DIVIDER_STYLE} />
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>プライバシーポリシー</Text>
            <ComingSoonBadge />
          </View>
          <View style={ROW_DIVIDER_STYLE} />
          <View style={ROW_STYLE}>
            <Text style={ROW_LABEL_STYLE}>バージョン</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>v{APP_VERSION}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
