# コーディングルール スキル

## 概要

このスキルは workout-plus プロジェクトのコーディング規約を定義します。
Google Style Guide をベースに React Native / TypeScript のベストプラクティスを反映しています。

---

## 1. Enum の使用規約

### 基本方針

- **文字列リテラルの代わりに Enum を使う**
- マジックナンバー・マジック文字列を排除する
- React Native では `const enum` を避ける（Metro bundler との相性問題）
- 代わりに **通常の `enum`** または **`as const` オブジェクト** を使う

### 命名規則

```typescript
// Enum 名: PascalCase（単数形）
// メンバー名: PascalCase

// NG: 文字列リテラルの直接使用
if (status === 'completed') { ... }

// OK: Enum を使用
enum WorkoutStatus {
  InProgress = 'in_progress',
  Completed  = 'completed',
  Cancelled  = 'cancelled',
}

if (status === WorkoutStatus.Completed) { ... }
```

### ユースケース別の使い分け

```typescript
// ① enum（通常）: React Native / Metro で安全に使える
enum MuscleGroup {
  Chest     = 'chest',
  Back      = 'back',
  Legs      = 'legs',
  Shoulders = 'shoulders',
  Arms      = 'arms',
  Core      = 'core',
}

// ② as const: 外部 API・DB の値と一致させる場合、または Union 型が欲しい場合
const SetType = {
  Normal:     'normal',
  WarmUp:     'warm_up',
  DropSet:    'drop_set',
  FailureSet: 'failure_set',
} as const;

type SetType = (typeof SetType)[keyof typeof SetType];

// ③ 一覧が必要な場合（画面上の選択肢など）
const MUSCLE_GROUP_OPTIONS = Object.values(MuscleGroup);
```

### Enum の配置ルール

```
src/
  constants/
    enums.ts        # アプリ全体で使う Enum
  features/
    workout/
      types.ts      # workout ドメイン固有の Enum・型
```

---

## 2. React Native 固有の規約

### StyleSheet

```typescript
// NG: インラインスタイル（再レンダー時にオブジェクト生成が走る）
<View style={{ flex: 1, backgroundColor: '#f9fafb' }} />

// OK: StyleSheet.create でまとめる
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // アプリ背景色
  },
});
```

### Platform 分岐

```typescript
// 小さな差異: Platform.select
const shadowStyle = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 2 },
});

// 大きな差異: ファイル分割
// SetInputRow.ios.tsx / SetInputRow.android.tsx
```

### パフォーマンス

```typescript
// コールバックは useCallback でメモ化（FlatList の子コンポーネントに渡す場合）
const handleSetComplete = useCallback((setId: string) => {
  // ...
}, []);

// FlatList の keyExtractor は必ず指定
<FlatList
  keyExtractor={(item) => item.id}
  renderItem={renderSetItem}
/>
```

---

## 3. 副作用の管理

### 基本方針

- **ビジネスロジックは純粋関数で書く**（同じ入力 → 必ず同じ出力）
- 副作用（API 通信・ストレージ・タイマー）は**境界に閉じ込める**
- コンポーネントに副作用ロジックを直書きしない

### 純粋関数を優先する

```typescript
// NG: 関数内でグローバル状態を書き換える（副作用）
function addSet(exercise: Exercise): void {
  exercise.sets.push({ weight: 0, reps: 0 }); // 引数を直接変更している
}

// OK: 入力を変更せず新しい値を返す（純粋関数）
function addSet(exercise: Exercise): Exercise {
  return {
    ...exercise,
    sets: [...exercise.sets, { weight: 0, reps: 0 }],
  };
}
```

### 副作用は useEffect・カスタムフック・サービス層に閉じ込める

```typescript
// NG: コンポーネント本体に副作用を直書き
const WorkoutScreen: React.FC = () => {
  AsyncStorage.setItem('session', JSON.stringify(session)); // レンダー中に副作用
  // ...
};

// OK: useEffect で副作用を明示的に管理
const WorkoutScreen: React.FC = () => {
  useEffect(() => {
    // セッション変更時のみ保存（依存配列で制御）
    AsyncStorage.setItem('session', JSON.stringify(session));
  }, [session]);
  // ...
};

// より良い: カスタムフックに副作用を隠蔽
const { saveSession } = useWorkoutSession();
```

### カスタムフックで副作用を集約する

```typescript
/**
 * ワークアウトセッションの永続化を担当するフック。
 * コンポーネントは保存の詳細を知らなくてよい。
 */
function useWorkoutSession(sessionId: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);

  // 読み込み（副作用）
  useEffect(() => {
    WorkoutRepository.findById(sessionId).then(setSession);
  }, [sessionId]);

  // 書き込み（副作用を関数に閉じ込める）
  const saveSession = useCallback(async (data: WorkoutSession) => {
    await WorkoutRepository.save(data);
    setSession(data);
  }, []);

  return { session, saveSession };
}
```

### サービス層でネットワーク・ストレージの副作用を分離する

```
src/
  services/
    workout-repository.ts   # DB・AsyncStorage アクセス（副作用を集約）
    api-client.ts           # ネットワーク通信（副作用を集約）
  utils/
    workout-calculator.ts   # 純粋関数のみ（副作用なし）
  hooks/
    use-workout-session.ts  # 副作用とコンポーネントの橋渡し
```

---

## 4. ファイル・変数命名

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | kebab-case | `workout-session.ts` |
| React Native コンポーネント | PascalCase | `WorkoutCard.tsx` |
| 変数・関数 | camelCase | `calculateVolume` |
| グローバル定数 | UPPER_SNAKE_CASE | `MAX_SETS_PER_EXERCISE` |
| 型・インターフェース | PascalCase | `WorkoutSession` |
| Enum | PascalCase | `MuscleGroup` |

---

## 5. インポート順序

```typescript
// 1. React / React Native
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// 2. 外部ライブラリ
import { useNavigation } from '@react-navigation/native';

// 3. 内部モジュール（絶対パス）
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutStatus } from '@/constants/enums';

// 4. 相対パス
import { calculateVolume } from './utils';

// 5. 型インポート（type キーワードを付ける）
import type { WorkoutSession } from '@/types';
```
