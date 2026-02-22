/**
 * ルートナビゲーター
 * メインタブ + モーダルスタック（破棄確認）
 *
 * 構造:
 * RootNavigator (Stack)
 * ├── MainTabs (HomeTab / CalendarTab / RecordTab / StatsTab / AITab)
 * └── DiscardDialog (transparentModal)
 *
 * RecordTab はメインタブの1つとして MainTabs 内で管理する。
 * タブバーを常時表示するため Root レベルから除外した。
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { RootStackParamList } from '@/types';

import { MainTabs } from './MainTabs';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** 破棄確認ダイアログ画面（プレースホルダー） */
function DiscardDialogScreen() {
  return <PlaceholderScreen name="破棄確認" />;
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="DiscardDialog"
        component={DiscardDialogScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}
