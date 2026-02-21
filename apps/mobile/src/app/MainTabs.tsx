/**
 * メインタブナビゲーター
 * ワイヤーフレーム準拠: ホーム / カレンダー / [+]記録ボタン / 統計
 * 中央の[+]ボタンはカスタムタブボタンとして実装
 * Ionicons でタブアイコンを表示
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '@/shared/constants/colors';
import type { MainTabParamList, RootStackParamList } from '@/types';

import { CalendarStack } from './CalendarStack';
import { HomeStack } from './HomeStack';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** 統計画面（プレースホルダー・disabled状態） */
function StatsScreen() {
  return <PlaceholderScreen name="統計" />;
}

/** 中央の記録開始ボタン（カスタムタブボタン） */
function RecordTabButton() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('RecordStack')}
      style={({ pressed }) => ({
        top: -24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: pressed ? colors.primaryDark : colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.background,
      })}
    >
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* + アイコン（シンプルなクロスライン） */}
        <View
          style={{
            position: 'absolute',
            width: 20,
            height: 2.5,
            backgroundColor: colors.white,
            borderRadius: 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 2.5,
            height: 20,
            backgroundColor: colors.white,
            borderRadius: 1,
          }}
        />
      </View>
    </Pressable>
  );
}

/** ダミーコンポーネント（RecordButtonタブ用。実際には表示されない） */
function EmptyComponent() {
  return null;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 84,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '400',
          letterSpacing: 0.2,
        },
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
        name="RecordButton"
        component={EmptyComponent}
        options={{
          tabBarButton: () => <RecordTabButton />,
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
    </Tab.Navigator>
  );
}
