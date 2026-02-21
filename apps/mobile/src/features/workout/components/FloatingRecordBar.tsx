/**
 * T043: FloatingRecordBar
 * recording中のワークアウトがある場合に画面下部に表示するバー
 * タップでRecordScreenへ遷移する
 * 経過時間と現在の種目数を表示
 */
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { borderRadius } from '@/shared/constants/borderRadius';
import { colors } from '@/shared/constants/colors';
import { fontSize, fontWeight } from '@/shared/constants/typography';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

type FloatingRecordBarProps = {
  /** タップ時コールバック（RecordScreenへ遷移） */
  onPress: () => void;
};

/** 秒数をMM:SS形式にフォーマットする */
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FloatingRecordBar({ onPress }: FloatingRecordBarProps) {
  const currentWorkout = useWorkoutSessionStore((s) => s.currentWorkout);
  const currentExercises = useWorkoutSessionStore((s) => s.currentExercises);
  const timerStatus = useWorkoutSessionStore((s) => s.timerStatus);
  const elapsedSeconds = useWorkoutSessionStore((s) => s.elapsedSeconds);
  const timerStartedAt = useWorkoutSessionStore((s) => s.timerStartedAt);

  // タイマーが running 中はリアルタイムで更新
  const [displaySeconds, setDisplaySeconds] = useState(elapsedSeconds);

  useEffect(() => {
    if (timerStatus !== 'running' || !timerStartedAt) {
      setDisplaySeconds(elapsedSeconds);
      return;
    }

    // 1秒ごとに更新
    const interval = setInterval(() => {
      const now = Date.now();
      const additionalSeconds = Math.floor((now - timerStartedAt) / 1000);
      setDisplaySeconds(elapsedSeconds + additionalSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus, timerStartedAt, elapsedSeconds]);

  // recording中のワークアウトがない場合は非表示
  if (!currentWorkout) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 88,
        left: 16,
        right: 16,
        zIndex: 50,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: borderRadius.lg,
          backgroundColor: pressed ? colors.primaryDark : colors.primary,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        })}
      >
        {/* 左側: 状態テキスト */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* 録音インジケーター（赤い丸） */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#EF4444',
            }}
          />
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.white,
            }}
          >
            記録中
          </Text>
          <Text
            style={{
              fontSize: fontSize.xs,
              fontWeight: fontWeight.normal,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {currentExercises.length}種目
          </Text>
        </View>

        {/* 右側: 経過時間 */}
        <Text
          style={{
            fontSize: fontSize.md,
            fontWeight: fontWeight.bold,
            color: colors.white,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatTime(displaySeconds)}
        </Text>
      </Pressable>
    </View>
  );
}
