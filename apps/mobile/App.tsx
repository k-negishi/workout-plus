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
import { generateDevWorkoutSeedSQL } from '@/database/seed';
import type { WorkoutRow } from '@/database/types';
import { colors } from '@/shared/constants/colors';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { Workout } from '@/types/workout';

/** DB の WorkoutRow（snake_case）をストアの Workout（camelCase）に変換する */
function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    timerStatus: row.timer_status,
    elapsedSeconds: row.elapsed_seconds,
    timerStartedAt: row.timer_started_at,
    memo: row.memo,
  };
}

export default function App() {
  // DB初期化が完了するまでスプラッシュを表示
  const [isReady, setIsReady] = useState(false);
  const setCurrentWorkout = useWorkoutSessionStore((s) => s.setCurrentWorkout);

  useEffect(() => {
    async function bootstrap() {
      try {
        // DBスキーマ初期化 + マイグレーション
        // getDatabase() が openDatabaseAsync → WAL設定 → runMigrations を一括実行する
        const db = await getDatabase();

        // 開発環境のみ、UI確認用のダミーデータを投入（冪等）
        await generateDevWorkoutSeedSQL(db);

        // T044: recording 状態のワークアウトがあればストアに復元
        // WorkoutRepository は WorkoutRow（snake_case）を返すため Workout（camelCase）にマッピング
        const recordingRow = await WorkoutRepository.findRecording();
        if (recordingRow) {
          setCurrentWorkout(rowToWorkout(recordingRow));
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
