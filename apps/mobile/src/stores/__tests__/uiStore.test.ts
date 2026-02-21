/**
 * uiStore テスト
 * Zustand ストアのアクションと状態遷移を検証する
 */
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useUIStore.setState({
      isExercisePickerVisible: false,
      isDiscardDialogVisible: false,
      isLoading: false,
    });
  });

  describe('初期状態', () => {
    it('全フラグが false で初期化される', () => {
      const state = useUIStore.getState();
      expect(state.isExercisePickerVisible).toBe(false);
      expect(state.isDiscardDialogVisible).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('ExercisePicker モーダル', () => {
    it('showExercisePicker で表示される', () => {
      useUIStore.getState().showExercisePicker();
      expect(useUIStore.getState().isExercisePickerVisible).toBe(true);
    });

    it('hideExercisePicker で非表示になる', () => {
      useUIStore.getState().showExercisePicker();
      useUIStore.getState().hideExercisePicker();
      expect(useUIStore.getState().isExercisePickerVisible).toBe(false);
    });
  });

  describe('DiscardDialog モーダル', () => {
    it('showDiscardDialog で表示される', () => {
      useUIStore.getState().showDiscardDialog();
      expect(useUIStore.getState().isDiscardDialogVisible).toBe(true);
    });

    it('hideDiscardDialog で非表示になる', () => {
      useUIStore.getState().showDiscardDialog();
      useUIStore.getState().hideDiscardDialog();
      expect(useUIStore.getState().isDiscardDialogVisible).toBe(false);
    });
  });

  describe('ローディング状態', () => {
    it('setLoading(true) でローディング開始', () => {
      useUIStore.getState().setLoading(true);
      expect(useUIStore.getState().isLoading).toBe(true);
    });

    it('setLoading(false) でローディング終了', () => {
      useUIStore.getState().setLoading(true);
      useUIStore.getState().setLoading(false);
      expect(useUIStore.getState().isLoading).toBe(false);
    });
  });

  describe('各モーダルは独立して動作する', () => {
    it('ExercisePicker を開いても DiscardDialog に影響しない', () => {
      useUIStore.getState().showExercisePicker();
      expect(useUIStore.getState().isDiscardDialogVisible).toBe(false);
    });

    it('DiscardDialog を開いても ExercisePicker に影響しない', () => {
      useUIStore.getState().showDiscardDialog();
      expect(useUIStore.getState().isExercisePickerVisible).toBe(false);
    });
  });
});
