/**
 * メインタブナビゲーター（T07: 4タブ化）
 *
 * T07: FloatingRecordButton と RecordTab を廃止。
 * ホーム/カレンダーそれぞれのスタック内で Record 画面へ遷移する設計に変更。
 * これにより中央インデント（BUTTON_RISE）が不要になり、
 * シンプルな4タブバーに整理できる。
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
import { AIScreen } from './screens/AIScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** 統計画面（プレースホルダー・disabled状態） */
function StatsScreen() {
  return <PlaceholderScreen name="統計" />;
}

/**
 * シンプルなカスタムタブバー（T07: FloatingRecordButton 廃止後のシンプル版）
 *
 * BUTTON_RISE や中央インデントが不要になったため、
 * 素直な4アイテムのフラットなタブバーに整理する。
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const TAB_CONTENT = 56;
  const BOTTOM_SAFE = insets.bottom;
  const TAB_BAR_HEIGHT = TAB_CONTENT + BOTTOM_SAFE;

  return (
    <View style={{ height: TAB_BAR_HEIGHT }}>
      {/* 白背景 */}
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
