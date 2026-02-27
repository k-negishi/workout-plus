/**
 * タイマーバーコンポーネント
 * 経過時間表示、開始/停止、中止ボタンを含む上部固定バー
 * SafeArea 対応済み（T019 確認）— 親の RecordScreen が insets.top を適用するため本コンポーネントでは不要
 */
import React, { useCallback, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TimerStatus } from '@/types';

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

/**
 * 「MM:SS」または「HH:MM:SS」形式の文字列を秒数に変換する。
 * 不正な入力の場合は null を返す。
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':').map(Number);
  // 全パートが有効な数値であることを確認
  if (parts.some((p) => isNaN(p) || p < 0)) return null;

  if (parts.length === 2) {
    // MM:SS 形式
    const [minutes, seconds] = parts;
    return minutes! * 60 + seconds!;
  }
  if (parts.length === 3) {
    // HH:MM:SS 形式
    const [hours, minutes, seconds] = parts;
    return hours! * 3600 + minutes! * 60 + seconds!;
  }
  return null;
}

/**
 * タイマー状態に応じた再生ボタンのスタイルを返す。
 * TimerBar の cyclomatic complexity を下げるため外部ヘルパーに分離。
 */
function resolvePlayButtonStyle(isDiscarded: boolean): { borderColor: string; textColor: string } {
  if (isDiscarded) {
    return { borderColor: '#94a3b8', textColor: '#94a3b8' };
  }
  return { borderColor: '#4D94FF', textColor: '#4D94FF' };
}

export type TimerBarProps = {
  timerStatus: TimerStatus;
  elapsedSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  /** discarded 状態から 0:00 でタイマーを再開する（Issue #175） */
  onResetAndStart: () => void;
  onStopTimer: () => void;
  onComplete: () => void;
  /** 経過秒数を手動でセットする（Issue #175） */
  onManualTimeSet: (seconds: number) => void;
  /** 終了ボタンの無効化（種目0件時） */
  isCompleteDisabled?: boolean;
};

export const TimerBar: React.FC<TimerBarProps> = ({
  timerStatus,
  elapsedSeconds,
  onStart,
  onPause,
  onResume,
  onResetAndStart,
  onStopTimer,
  onComplete,
  onManualTimeSet,
  isCompleteDisabled = false,
}) => {
  // 手入力モードの状態管理
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  /** 再生/一時停止ボタンのハンドラー */
  const handleToggle = useCallback(() => {
    switch (timerStatus) {
      case TimerStatus.NOT_STARTED:
        onStart();
        break;
      case 'running':
        onPause();
        break;
      case 'paused':
        onResume();
        break;
      case 'discarded':
        // Issue #175: discarded 状態でも 0:00 から再開可能
        onResetAndStart();
        break;
    }
  }, [timerStatus, onStart, onPause, onResume, onResetAndStart]);

  /** 手入力モードを開始する（paused/discarded 時のみ） */
  const handleStartEditing = useCallback(() => {
    setEditText(formatTime(elapsedSeconds));
    setIsEditing(true);
  }, [elapsedSeconds]);

  /** 手入力を確定する */
  const handleSubmitEditing = useCallback(() => {
    const seconds = parseTimeInput(editText);
    if (seconds != null) {
      onManualTimeSet(seconds);
    }
    setIsEditing(false);
  }, [editText, onManualTimeSet]);

  const isTimerDiscarded = timerStatus === 'discarded';
  const toggleLabel = timerStatus === 'running' ? '||' : '\u25B6';
  const elapsedLabel = isTimerDiscarded ? '時間なし' : formatTime(elapsedSeconds);
  const elapsedLabelColor = isTimerDiscarded ? '#94a3b8' : '#334155';
  const playButtonStyle = resolvePlayButtonStyle(isTimerDiscarded);

  // 手入力可能: paused または discarded（running/not_started は不可）
  const canEdit = timerStatus === 'paused' || timerStatus === 'discarded';

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
      <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '400', marginRight: 8 }}>
        経過時間
      </Text>

      {/* 再生/一時停止ボタン: discarded でも有効（Issue #175） */}
      <TouchableOpacity
        onPress={handleToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: playButtonStyle.borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={timerStatus === 'running' ? '一時停止' : '開始'}
      >
        <Text style={{ fontSize: 12, color: playButtonStyle.textColor, lineHeight: 12 }}>
          {toggleLabel}
        </Text>
      </TouchableOpacity>

      {/* 一時停止中ラベル */}
      {timerStatus === 'paused' && (
        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '400', marginLeft: 8 }}>
          一時停止中
        </Text>
      )}

      {/* 経過時間表示 / 手入力（Issue #175） */}
      {isEditing ? (
        <TextInput
          style={{
            marginLeft: 'auto',
            fontSize: 18,
            fontWeight: '700',
            color: '#334155',
            fontVariant: ['tabular-nums'],
            minWidth: 80,
            textAlign: 'right',
            borderBottomWidth: 1,
            borderBottomColor: '#4D94FF',
            paddingVertical: 0,
          }}
          value={editText}
          onChangeText={setEditText}
          onSubmitEditing={handleSubmitEditing}
          onBlur={handleSubmitEditing}
          keyboardType="numbers-and-punctuation"
          autoFocus
          selectTextOnFocus
          accessibilityLabel="経過時間の手入力"
        />
      ) : canEdit ? (
        <TouchableOpacity
          onPress={handleStartEditing}
          style={{ marginLeft: 'auto' }}
          accessibilityLabel="経過時間を編集"
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: elapsedLabelColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {elapsedLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text
          style={{
            marginLeft: 'auto',
            fontSize: 18,
            fontWeight: '700',
            color: elapsedLabelColor,
            fontVariant: ['tabular-nums'],
          }}
        >
          {elapsedLabel}
        </Text>
      )}

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
          <Text style={{ fontSize: 16, color: '#64748b' }}>{'\u00D7'}</Text>
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
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>完了</Text>
      </TouchableOpacity>
    </View>
  );
};
