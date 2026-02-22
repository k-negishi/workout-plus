/**
 * メインタブナビゲーター
 * ワイヤーフレーム準拠: ホーム / カレンダー / [+]記録ボタン / 統計 / AI
 *
 * +ボタン実装方針:
 * BottomTabBar ラッパー方式は React Navigation の内部 View が overflow:hidden を持つため
 * ボタンが clip される問題があった。
 * 代わりに「タブバー全体を完全カスタム実装」し、ボタン分のスペース(BUTTON_RISE)を
 * コンテナ高さに含めることで overflow 不要とする。
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/constants/colors';
import type { MainTabParamList } from '@/types';

import { CalendarStack } from './CalendarStack';
import { HomeStack } from './HomeStack';
import { RecordStack } from './RecordStack';
import { AIScreen } from './screens/AIScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** 統計画面（プレースホルダー・disabled状態） */
function StatsScreen() {
  return <PlaceholderScreen name="統計" />;
}

/**
 * 中央の記録開始ボタン（フローティング）
 *
 * useNavigation() はタブバーが Root レベルのコンテキストで描画されるため
 * RootStack の navigation を返してしまい RecordTab を解決できない。
 * CustomTabBar が BottomTabBarProps として受け取る navigation（タブ navigator 確実）
 * を prop で渡すことで正しく遷移できる。
 */
function FloatingRecordButton({ navigation }: Pick<BottomTabBarProps, 'navigation'>) {
  return (
    <Pressable
      testID="record-tab-button"
      onPress={() => navigation.navigate('RecordTab' as never)}
      style={{
        // WF L344-346: width: 56px, height: 56px, border-radius: 50%
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        // WF L353: box-shadow: 0 4px 16px rgba(77,148,255,0.4)
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        shadowOpacity: 0.4,
        elevation: 8,
        // WF L354: border: 4px solid var(--md-sys-color-background)
        borderWidth: 4,
        borderColor: colors.background,
      }}
    >
      <Text
        style={{
          // WF L350-352: font-size: 28px, color: white
          fontSize: 28,
          lineHeight: 28,
          fontWeight: '300',
          color: colors.white,
        }}
      >
        +
      </Text>
    </Pressable>
  );
}

/**
 * 完全カスタムタブバー
 *
 * レイアウト構成（高さの内訳）:
 *   BUTTON_RISE  (24px): ボタンがタブアイテム上端より浮き上がる透明ゾーン
 *   TAB_CONTENT (56px): アイコン + ラベルの実表示エリア
 *   BOTTOM_SAFE (insets.bottom): iPhone ホームインジケーター等のセーフエリア
 *
 * +ボタン (56px) は top:0 に配置するため、
 * - 0 〜 24px: 透明ゾーンに収まる（コンテンツ背景が透過して見える）
 * - 24 〜 56px: 白背景エリアに重なる
 * overflow: visible 不要でコンテナ内に完全に収まる。
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const BUTTON_RISE = 24;
  const TAB_CONTENT = 56;
  const BOTTOM_SAFE = insets.bottom;
  const TAB_BAR_HEIGHT = TAB_CONTENT + BOTTOM_SAFE;
  const TOTAL_HEIGHT = BUTTON_RISE + TAB_BAR_HEIGHT;

  return (
    <View style={{ height: TOTAL_HEIGHT }}>
      {/* 白背景: タブアイテムエリア（下部 TAB_BAR_HEIGHT 分のみ）*/}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      />

      {/* タブアイテム行（セーフエリアより上） */}
      <View
        style={{
          position: 'absolute',
          bottom: BOTTOM_SAFE,
          left: 0,
          right: 0,
          height: TAB_CONTENT,
          flexDirection: 'row',
        }}
      >
        {state.routes.map((route, index) => {
          // 中央スロット: FloatingRecordButton のスペースとして空けておく
          if (route.name === 'RecordTab') {
            return <View key={route.key} style={{ flex: 1 }} />;
          }

          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : '';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingTop: 8,
              }}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? colors.primary : colors.textSecondary,
                size: 24,
              })}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '400',
                  letterSpacing: 0.2,
                  color: focused ? colors.primary : colors.textSecondary,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* フローティングボタン: コンテナ上端に配置 */}
      {/* top: 0 から 56px 分が全てコンテナ内に収まるため overflow 不要 */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <FloatingRecordButton navigation={navigation} />
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          tabBarLabel: 'カレンダー',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RecordTab"
        component={RecordStack}
        options={{
          // 中央スロットはアイコン・ラベルなし（FloatingRecordButton がオーバーレイ）
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarAccessibilityLabel: '記録を開始',
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: '統計',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AITab"
        component={AIScreen}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
