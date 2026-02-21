/**
 * T048: DiscardDialog
 * 変更破棄確認ダイアログ（透過モーダル）
 * RecordScreen・WorkoutEditScreenの両方から呼び出し可能
 */
import React from 'react';

import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

type DiscardDialogProps = {
  /** 表示状態 */
  visible: boolean;
  /** 破棄時コールバック */
  onDiscard: () => void;
  /** 続行時コールバック */
  onCancel: () => void;
};

export function DiscardDialog({
  visible,
  onDiscard,
  onCancel,
}: DiscardDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      title="変更を破棄しますか？"
      message="保存されていない変更は失われます。"
      confirmLabel="破棄する"
      cancelLabel="続ける"
      confirmStyle="destructive"
      onConfirm={onDiscard}
      onCancel={onCancel}
    />
  );
}
