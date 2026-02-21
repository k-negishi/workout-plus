/**
 * Toast ユーティリティ
 * React Native の Alert を使ったシンプルなトースト表示
 * burnt はネイティブモジュールのため Expo Go では使用不可
 */
import { Alert, Platform, ToastAndroid } from 'react-native';

/** 成功トーストを表示 */
export function showSuccessToast(message: string, title?: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS: 軽量な Alert で代替
    Alert.alert(title ?? '完了', message);
  }
}

/** エラートーストを表示 */
export function showErrorToast(message: string, title?: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(title ?? 'エラー', message);
  }
}
