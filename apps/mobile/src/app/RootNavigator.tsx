/**
 * ルートナビゲーター
 * メインタブ + モーダルスタック（記録フロー、破棄確認）
 *
 * 構造:
 * RootNavigator (Stack - modal mode)
 * ├── MainTabs
 * ├── RecordStack (fullScreenModal)
 * └── DiscardDialog (transparentModal)
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { RootStackParamList } from '@/types';

import { MainTabs } from './MainTabs';
import { RecordStack } from './RecordStack';
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
        name="RecordStack"
        component={RecordStack}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
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
