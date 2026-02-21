/**
 * タイマーバーコンポーネント
 * 経過時間表示、開始/停止、中止ボタンを含む上部固定バー
 */
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { TimerStatus } from '@/types';

/** 秒数をフォーマットする（MM:SS または HH:MM:SS） */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export type TimerBarProps = {
  timerStatus: TimerStatus;
  elapsedSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onComplete: () => void;
  /** 完了ボタンの無効化（種目0件時） */
  isCompleteDisabled?: boolean;
};

export const TimerBar: React.FC<TimerBarProps> = ({
  timerStatus,
  elapsedSeconds,
  onStart,
  onPause,
  onResume,
  onDiscard,
  onComplete,
  isCompleteDisabled = false,
}) => {
  /** 再生/一時停止ボタンのハンドラー */
  const handleToggle = useCallback(() => {
    switch (timerStatus) {
      case 'notStarted':
        onStart();
        break;
      case 'running':
        onPause();
        break;
      case 'paused':
        onResume();
        break;
    }
  }, [timerStatus, onStart, onPause, onResume]);

  /** 再生/一時停止ボタンのラベル */
  const toggleLabel = timerStatus === 'running' ? '||' : '\u25B6';

  return (
    <View className="flex-row items-center px-5 py-2 bg-white border-b border-[#e2e8f0]">
      {/* 経過時間ラベル */}
      <Text className="text-[13px] text-[#64748b] font-normal mr-2">経過時間</Text>

      {/* 再生/一時停止ボタン */}
      <TouchableOpacity
        onPress={handleToggle}
        className="w-6 h-6 rounded-full border-[1.5px] border-[#4D94FF] items-center justify-center"
        accessibilityLabel={timerStatus === 'running' ? '一時停止' : '開始'}
      >
        <Text className="text-[10px] text-[#4D94FF] leading-[10px]">{toggleLabel}</Text>
      </TouchableOpacity>

      {/* 一時停止中ラベル */}
      {timerStatus === 'paused' && (
        <Text className="text-[11px] text-[#64748b] font-normal ml-2">一時停止中</Text>
      )}

      {/* 経過時間表示 */}
      <Text
        className="ml-auto text-[16px] font-bold text-[#334155]"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatTime(elapsedSeconds)}
      </Text>

      {/* 中止ボタン */}
      <TouchableOpacity
        onPress={onDiscard}
        className="ml-2 w-6 h-6 items-center justify-center"
        accessibilityLabel="ワークアウトを中止"
      >
        <Text className="text-[14px] text-[#64748b]">{'\u00D7'}</Text>
      </TouchableOpacity>

      {/* 完了ボタン */}
      <TouchableOpacity
        onPress={onComplete}
        disabled={isCompleteDisabled}
        className={`ml-3 px-5 py-2 rounded-lg ${
          isCompleteDisabled ? 'bg-[#d1d5db]' : 'bg-[#10B981]'
        }`}
        accessibilityLabel="ワークアウトを完了"
      >
        <Text className="text-[14px] font-semibold text-white">完了</Text>
      </TouchableOpacity>
    </View>
  );
};
