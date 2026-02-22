/**
 * ルートナビゲーター
 * メインタブ + モーダルスタック（記録フロー、破棄確認）
 *
 * 構造:
 * RootNavigator (Stack)
 * ├── MainTabs
 * ├── RecordStack (通常push遷移)
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
      {/* 記録フロー: モーダルではなく通常のpush遷移（右からスライド） */}
      <Stack.Screen name="RecordStack" component={RecordStack} />
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
