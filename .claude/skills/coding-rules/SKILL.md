---
name: coding-rules
description: workout-plus プロジェクトのコーディング規約リファレンス。TypeScript, React実装、 Enum/型定義・StyleSheet・パフォーマンス最適化・副作用管理・命名規則・インポート順序など実装時の判断基準を提供する。コードレビューや実装方針の確認時に参照する。
allowed-tools: Read
metadata:
  author: workout-plus
  version: '1.0.0'
---

# コーディングルール スキル

## 概要

このスキルは workout-plus プロジェクトのコーディング規約を定義します。
Google Style Guide をベースに React Native / TypeScript のベストプラクティスを反映しています。

---

## 1. Enum の使用規約

### 基本方針

- **`enum` キーワードは使わない**（バンドルサイズ増加・逆マッピング副作用・`const enum` の erase 問題）
- **`as const` パターンで統一する**
- Single Source of Truth（SSOT）: 全 Union Type は `src/types/` で定義
- `database/types.ts` は Row 型のみを保持し、Union Type は `src/types/` から re-export する

### as const パターン（標準）

```typescript
// ✅ 正しい書き方
export const WorkoutStatus = {
  RECORDING: 'recording',   // シンボル名: UPPER_SNAKE_CASE
  COMPLETED: 'completed',   // DB格納値: lowercase_snake_case
} as const;
export type WorkoutStatus = (typeof WorkoutStatus)[keyof typeof WorkoutStatus];

// 参照時
if (status === WorkoutStatus.RECORDING) { ... }   // シンボルで参照（推奨）
if (status === 'recording') { ... }               // 文字列リテラルも型安全（後方互換）

// 全値列挙（バリデーション・UI選択肢に使用）
const allStatuses = Object.values(WorkoutStatus); // ['recording', 'completed']
```

```typescript
// ❌ 使わない
enum WorkoutStatus { Recording = 'recording' }      // enum キーワード禁止
const enum WorkoutStatus { Recording = 'recording' } // const enum も禁止
```

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| const オブジェクト名 | PascalCase（型名と同じ） | `WorkoutStatus` |
| メンバー名（キー） | UPPER_SNAKE_CASE | `WorkoutStatus.NOT_STARTED` |
| DB格納値（value） | lowercase_snake_case | `'not_started'` |
| 型エイリアス名 | PascalCase | `type WorkoutStatus = ...` |

### 配置ルール（SSOT）

```
src/
  types/            ← Union Type の Single Source of Truth
    workout.ts      # WorkoutStatus, TimerStatus, MuscleGroup, Equipment
    pr.ts           # PRType
    exercise.ts     # Exercise型（MuscleGroup/Equipment は workout.ts から import）
    index.ts        # 全型の公開 API（value export + type export を分けて管理）
  database/
    types.ts        # Row型のみ。Union Type は ../types/ から re-export
```

### import スタイル

```typescript
// コンポーネント・フック: as const の値が必要なため value import
import { TimerStatus } from '@/types/workout';

// DB層（Row型のみ使用）: type import で十分
import type { MuscleGroup } from '../types/workout';
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

### DB 変更後は必ず UI を同期する

Repository の write 系メソッド（create / update / delete / toggle 等）を呼んだ後は、
必ず表示データを更新する。しないと UI が DB と乖離した古い状態を表示し続ける。

```typescript
// NG: DB を変更したが UI を更新しない → 画面が古い状態のまま
const handleToggleFavorite = async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
  // ← 何もしないと一覧の表示が変わらない
};

// OK パターン A: 再取得（DB の最新状態を信頼する）
const handleToggleFavorite = async (id: string) => {
  await ExerciseRepository.toggleFavorite(id);
  await loadExercises(); // ← DB から最新リストを再取得して state に反映
};

// OK パターン B: 楽観的更新（レスポンシブな UX が必要な場合）
const handleToggleFavorite = async (id: string) => {
  setExercises((prev) =>
    prev.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)),
  );
  try {
    await ExerciseRepository.toggleFavorite(id);
  } catch {
    await loadExercises(); // 失敗時は再取得でロールバック
  }
};
```

**使い分け**:
- 単純な CRUD → パターン A（再取得）で十分。実装がシンプル
- タップ → 即座に反応が必要な UX → パターン B（楽観的更新）

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

---

## 6. Repository パターン — 戻り値は常にcamelCase

`*Repository` の全メソッドは**内部で snake_case → camelCase 変換済み**の TypeScript 型を返す。
呼び出し側で snake_case フィールド名を使うのは誤り。

```typescript
// NG: Repository の戻り値に snake_case でアクセスする
const newSet = await SetRepository.create({
  workout_exercise_id: workoutExerciseId,  // ERROR: CreateSetParams は camelCase
  set_number: nextNum,
});
const id = newSet.workout_exercise_id;  // ERROR: WorkoutSet は camelCase

// OK: 引数も戻り値も camelCase で一貫する
const newSet = await SetRepository.create({
  workoutExerciseId,   // CreateSetParams の正しいフィールド名
  setNumber: nextNum,
});
const id = newSet.workoutExerciseId;  // WorkoutSet の正しいフィールド名
```

**理由:** Repository 層が DB の snake_case と TypeScript の camelCase の橋渡しをしている。
呼び出し側は DB の存在を意識しなくてよい。型エラーに頼るだけでなく、意識的に守ること。

---

## 7. CI lint — コミット前に `simple-import-sort` を確認する

新しい import を追加した場合（特に既存行の間に挿入した場合）、
`simple-import-sort` ルールで CI が失敗することがある。

**コミット前に必ず確認:**

```bash
# 変更したファイルを対象に lint を実行（エラーがあれば自動修正）
npx eslint --fix <変更したファイルのパス>

# または変更ファイル全体にかける
pnpm lint
```

**よくある違反パターン:**
- `@react-navigation/native` のインポートを追加したとき（`useFocusEffect` など）
- 外部ライブラリと内部モジュールの順番が混在したとき
