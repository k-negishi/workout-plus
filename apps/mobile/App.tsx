/**
 * App.tsx — アプリケーションエントリーポイント
 *
 * T044: 起動時に recording 状態のワークアウトを復帰する処理を含む。
 * RootNavigator をラップし、データベース初期化・シード投入も担う。
 */

import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootNavigator } from '@/app/RootNavigator';
// initializeDatabase は存在しないため getDatabase() で代替する
// getDatabase() が内部で runMigrations() を呼ぶ（client.ts参照）
import { getDatabase } from '@/database/client';
import { WorkoutRepository } from '@/database/repositories/workout';
import { colors } from '@/shared/constants/colors';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

export default function App() {
  // DB初期化が完了するまでスプラッシュを表示
  const [isReady, setIsReady] = useState(false);
  const setCurrentWorkout = useWorkoutSessionStore((s) => s.setCurrentWorkout);

  useEffect(() => {
    async function bootstrap() {
      try {
        // DBスキーマ初期化 + マイグレーション
        // getDatabase() が openDatabaseAsync → WAL設定 → runMigrations を一括実行する
        await getDatabase();

        // T044: recording 状態のワークアウトがあればストアに復元
        // WorkoutRepository はプレーンオブジェクトのため new 不要
        const recordingWorkout = await WorkoutRepository.findRecording();
        if (recordingWorkout) {
          setCurrentWorkout(recordingWorkout);
        }
      } catch (error) {
        // 初期化エラーは握りつぶさず警告ログ（console.error は許可）
        console.error('App bootstrap error:', error);
      } finally {
        setIsReady(true);
      }
    }

    void bootstrap();
  }, [setCurrentWorkout]);

  // 初期化中はローディングスピナー表示
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* NavigationContainer はアプリで1つだけ必要 */}
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
