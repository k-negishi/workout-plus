---
paths:
  - "apps/mobile/src/**/*.{ts,tsx}"
---

# React Navigation フォーカス・ナビゲーション パターン

## 1. BottomTab 画面では `useEffect([], [])` でなく `useFocusEffect` を使う

**なぜ重要か:** `BottomTabNavigator` はタブ切り替え時も画面をアンマウントしない。
`useEffect([], [])` は初回マウント時のみ実行されるため、タブを離れて戻ってきた場合や
別スクリーンから navigate で遷移してきた場合に再実行されない。

```typescript
// NG: BottomTab 内の画面初期化に useEffect([], []) は使わない
useEffect(() => {
  void session.startSession(pendingId ?? undefined);
}, []);  // 初回マウント後は二度と実行されない

// OK: useFocusEffect で「画面がフォーカスを得るたびに」実行する
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

// 初回フォーカスと再フォーカスを区別する ref パターン
const initializedRef = useRef(false);

useFocusEffect(
  useCallback(() => {
    // Zustand store の最新値は getState() で取得（クロージャの陳腐化を防ぐ）
    const storeState = useMyStore.getState();
    const pendingId = storeState.pendingId;

    if (pendingId !== null) {
      // 再フォーカス時に処理が必要な場合（例: 継続モード）
      storeState.setPendingId(null);
      void session.startSession(pendingId);
    } else if (!initializedRef.current) {
      // 初回フォーカス時のみ実行する処理（例: 新規セッション開始）
      initializedRef.current = true;
      void session.startSession();
    }
    // pendingId なし & 初回済み → 何もしない（記録中の継続）
  }, [session]),
);
```

**適用ケース:**
- タブ画面の初期化処理（セッション開始、データ読み込みなど）
- 他の画面から戻ってきたときに状態を更新したい場合
- `pendingXxx` ストア値をトリガーにした画面間連携

---

## 2. 親ナビゲーターへの遷移は `navigate` をそのまま使う

React Navigation の `navigate` は、**現在のナビゲーターに見つからない場合、自動で親を遡って探す**。
`getParent()?.navigate()` は取得失敗時にサイレントに無視され、バグが気づきにくい。

```typescript
// NG: getParent() はオプショナルチェーンで失敗しても何も起きない
const parentNav = navigation.getParent();
parentNav?.navigate('RecordTab' as never);  // parentNav が null なら何も起きない

// OK: navigate をそのまま呼ぶ（React Navigation が親まで自動で探す）
navigation.navigate('RecordTab' as never);
```

**ネスト構造の例:**
```
RootNavigator (NativeStack)
  └── MainTabs (BottomTab)
        ├── HomeTab
        │     └── HomeStack (NativeStack)
        │           └── WorkoutDetailScreen  ← ここから
        └── RecordTab                        ← ここへ navigate できる
```

`WorkoutDetailScreen` で `navigation.navigate('RecordTab' as never)` を呼ぶと、
HomeStack → MainTabs (BottomTab) の順で自動的に遡って `RecordTab` を見つける。

---

## 3. 非同期アクションの失敗はかならずユーザーにフィードバックする

サイレントリターンは UX バグ。ユーザーはボタンを押したのに何も起きないと、
UI が壊れていると思う。

```typescript
// NG: サイレントリターン（何も起きないように見える）
const handleContinueWorkout = async () => {
  const recording = await WorkoutRepository.findRecording();
  if (recording) {
    return;  // ← ユーザーには何が起きたか分からない
  }
  // ...
};

// OK: Alert か Toast でフィードバックを必ず出す
const handleContinueWorkout = async () => {
  const recording = await WorkoutRepository.findRecording();
  if (recording) {
    Alert.alert(
      '記録中のセッションがあります',
      '先に現在のセッションを完了または破棄してください。',
      [{ text: 'OK' }],
    );
    return;
  }
  // ...
};
```
