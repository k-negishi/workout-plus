/**
 * UIストア（Zustand）
 * モーダル表示状態やローディングなどUI横断の状態管理
 */
import { create } from 'zustand';

type UIStoreState = {
  /** 種目選択モーダルの表示状態 */
  isExercisePickerVisible: boolean;
  /** 破棄確認ダイアログの表示状態 */
  isDiscardDialogVisible: boolean;
  /** ローディング状態 */
  isLoading: boolean;

  // === アクション ===
  showExercisePicker: () => void;
  hideExercisePicker: () => void;
  showDiscardDialog: () => void;
  hideDiscardDialog: () => void;
  setLoading: (loading: boolean) => void;
};

export const useUIStore = create<UIStoreState>((set) => ({
  isExercisePickerVisible: false,
  isDiscardDialogVisible: false,
  isLoading: false,

  showExercisePicker: () => set({ isExercisePickerVisible: true }),
  hideExercisePicker: () => set({ isExercisePickerVisible: false }),
  showDiscardDialog: () => set({ isDiscardDialogVisible: true }),
  hideDiscardDialog: () => set({ isDiscardDialogVisible: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
