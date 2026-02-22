# Implementation Plan: 重複種目防止 + 種目選択UI改善

**Branch**: `20260222-重複種目防止` | **Date**: 2026-02-22 | **Spec**: specs/20260222-重複種目防止/spec.md

## Summary

1ワークアウト内に同一種目を重複登録できてしまうバグを修正する。
対応方針は **A案（追加済みバッジ + タップ無効化）**:
- `useWorkoutSession.addExercise()` に重複チェックを追加（フックレベルの防護）
- `ExercisePickerScreen` で既追加種目をグレーアウト + 「✓ 追加済み」バッジ表示し、タップを無効化（UX防護）

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React Native 0.81.5 (Expo SDK 52), Zustand, @testing-library/react-native, Jest 29
**Storage**: expo-sqlite ~15.2.0（既存スキーマ変更なし）
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: iOS/Android (Expo Go)
**Project Type**: mobile
**Constraints**: オフライン動作必須、Hermes エンジン対応

## Constitution Check

| 原則 | 適合状況 |
|------|---------|
| I. ローカルファースト | ✅ DB/ストア変更はローカルのみ |
| II. 引き算のデザイン | ✅ グレーアウト+バッジのみ追加。大きな UI 変更なし |
| III. MVPスコープ厳守 | ✅ 既存バグ修正のみ。新規機能追加なし |
| VI. テスト・品質規律 | ✅ TDD で対応。既存テストに重複ケース追加 |

## Project Structure

### Documentation

```text
specs/20260222-重複種目防止/
├── spec.md       ✅
├── plan.md       ✅ (this file)
└── tasks.md      （/speckit.tasks で生成）
```

### 変更対象ファイル

```text
apps/mobile/src/
├── features/workout/hooks/
│   ├── useWorkoutSession.ts                        # addExercise() に重複チェック追加
│   └── __tests__/useWorkoutSession.test.ts         # 重複追加テストケース追加
└── features/exercise/screens/
    ├── ExercisePickerScreen.tsx                    # 追加済みバッジ + タップ無効化
    └── __tests__/ExercisePickerScreen.test.tsx     # 新規テストファイル（存在しない場合作成）
```

## Implementation Phases

### Phase 0: テスト先行（Red）

**useWorkoutSession.addExercise の重複チェックテスト**
- `useWorkoutSession.test.ts` に追加:
  - 「同じ exerciseId を2回 addExercise() しても currentExercises.length が増加しない」
  - 「重複時は showErrorToast が呼ばれない（A案では不要）」

**ExercisePickerScreen の追加済み表示テスト**（新規ファイル）
- 「currentExercises に含まれる exerciseId を持つ種目行に "追加済み" テキストが表示される」
- 「追加済み種目の行をタップしても session.addExercise が呼ばれない」

### Phase 1: 実装（Green）

**useWorkoutSession.ts**
```typescript
const addExercise = useCallback(async (exerciseId: string) => {
  if (!store.currentWorkout) return;

  // 重複チェック: 同じ exerciseId が既に存在する場合はスキップ
  if (store.currentExercises.some((e) => e.exerciseId === exerciseId)) {
    return; // A案: サイレントスキップ（UI側でタップ無効にするため）
  }

  // ... 既存の INSERT 処理
}, [store]);
```

**ExercisePickerScreen.tsx**
```typescript
// currentExercises から追加済み exerciseId セットを構築
const addedExerciseIds = useMemo(
  () => new Set(store.currentExercises.map((e) => e.exerciseId)),
  [store.currentExercises],
);

// renderItem 内
const isAdded = addedExerciseIds.has(item.id);

<TouchableOpacity
  onPress={() => !isAdded && handleSelectExercise(item)}
  disabled={isAdded}
  style={{ opacity: isAdded ? 0.5 : 1 }}
>
  {/* ... 既存の種目情報 ... */}
  {isAdded && (
    <View style={{ /* 追加済みバッジ */ }}>
      <Text>✓ 追加済み</Text>
    </View>
  )}
</TouchableOpacity>
```

### Phase 2: リファクタリング（Refactor）

- `addedExerciseIds` の `useMemo` 依存配列の最適化確認
- `store.currentExercises` の参照が ExercisePickerScreen で正しく更新されるか確認
- Lint / 型チェック通過確認

## Complexity Tracking

なし（既存パターンの拡張のみ）
