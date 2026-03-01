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

> **A案（副作用・非同期処理・DB 同期実装時 Read）**: `Read .claude/skills/coding-rules/side-effects.md`
> 純粋関数優先・useEffect への副作用閉じ込め・カスタムフック集約・DB 変更後 UI 同期ルールが収録されている。

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

---

## コメント・JSDoc 規約

### 基本方針

- **コメントは日本語で書く**
- 「何をしているか」ではなく「**なぜそうしているか**」を説明する
- 自明なコードにコメントは不要

### JSDoc コメント（公開 API・関数・コンポーネント）

```typescript
/**
 * ワークアウトセッションの合計ボリュームを計算する。
 *
 * ボリューム = 重量 × レップ数 の全セット合計。
 * 単位変換は行わず、入力値の単位系をそのまま使用する。
 *
 * @param sets - セットの配列。各セットは weight と reps を持つ
 * @returns 合計ボリューム（kg または lb）
 */
function calculateVolume(sets: WorkoutSet[]): number { ... }

/**
 * ワークアウト中のセット入力行コンポーネント。
 *
 * 前回の記録をグレーでインライン表示し、ユーザーの入力を促す。
 * TextInput の onChangeText は debounce せず即時反映する（UX 優先）。
 */
const SetInputRow: React.FC<SetInputRowProps> = ({ ... }) => { ... }
```

### インラインコメント

```typescript
// NG: 何をしているかの説明（自明）
const total = weight * reps; // 重量とレップを掛ける

// OK: なぜそうしているかの説明
// Android では KeyboardAvoidingView の behavior が iOS と異なるため分岐
const behavior = Platform.OS === 'ios' ? 'padding' : 'height';
```

### TODO / FIXME

```typescript
// TODO(Kei): パフォーマンス改善 - FlatList のキーが頻繁に変わり再レンダーが多い
// FIXME: Android 13 以下で Modal のアニメーションがカクつく (#42)
```

### 禁止事項

Issue 番号をコードコメントに載せることは禁止。`git log` でわかるため、コメントには書かない。
