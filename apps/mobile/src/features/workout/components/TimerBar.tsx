/**
 * タイマーバーコンポーネント
 * 経過時間表示、開始/停止、中止ボタンを含む上部固定バー
 * SafeArea 対応済み（T019 確認）— 親の RecordScreen が insets.top を適用するため本コンポーネントでは不要
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
  onStopTimer: () => void;
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
  onStopTimer,
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
      case 'discarded':
        break;
    }
  }, [timerStatus, onStart, onPause, onResume]);

  /** 再生/一時停止ボタンのラベル */
  const isTimerDiscarded = timerStatus === 'discarded';
  const toggleLabel = timerStatus === 'running' ? '||' : '\u25B6';
  const elapsedLabel = isTimerDiscarded ? '時間なし' : formatTime(elapsedSeconds);
  const elapsedLabelColor = isTimerDiscarded ? '#94a3b8' : '#334155';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
      }}
    >
      {/* 経過時間ラベル */}
      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '400', marginRight: 8 }}>
        経過時間
      </Text>

      {/* 再生/一時停止ボタン */}
      <TouchableOpacity
        onPress={handleToggle}
        disabled={isTimerDiscarded}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: isTimerDiscarded ? '#94a3b8' : '#4D94FF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={timerStatus === 'running' ? '一時停止' : '開始'}
      >
        <Text
          style={{ fontSize: 10, color: isTimerDiscarded ? '#94a3b8' : '#4D94FF', lineHeight: 10 }}
        >
          {toggleLabel}
        </Text>
      </TouchableOpacity>

      {/* 一時停止中ラベル */}
      {timerStatus === 'paused' && (
        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '400', marginLeft: 8 }}>
          一時停止中
        </Text>
      )}

      {/* 経過時間表示 */}
      <Text
        style={{
          marginLeft: 'auto',
          fontSize: 16,
          fontWeight: '700',
          color: elapsedLabelColor,
          fontVariant: ['tabular-nums'],
        }}
      >
        {elapsedLabel}
      </Text>

      {/* 中止ボタン */}
      {!isTimerDiscarded && (
        <TouchableOpacity
          onPress={onStopTimer}
          style={{
            marginLeft: 8,
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="時間計測を停止"
        >
          <Text style={{ fontSize: 14, color: '#64748b' }}>{'\u00D7'}</Text>
        </TouchableOpacity>
      )}

      {/* 完了ボタン */}
      <TouchableOpacity
        onPress={onComplete}
        disabled={isCompleteDisabled}
        style={{
          marginLeft: 12,
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: isCompleteDisabled ? '#d1d5db' : '#10B981',
        }}
        accessibilityLabel="ワークアウトを完了"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>完了</Text>
      </TouchableOpacity>
    </View>
  );
};
