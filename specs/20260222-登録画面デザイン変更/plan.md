# Implementation Plan: ワークアウト登録画面デザイン変更

**Branch**: `main`（当面の間 main で作業）| **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/20260222-登録画面デザイン変更/spec.md`

## Summary

ワークアウト登録画面の UI デザインを7点改善する。前回記録表示の統合（行ごと表示を廃止しヘッダーバッジのみに）、コピーボタン実装（現状スタブ → 機能実装）、プレースホルダー削除、種目削除ボタン追加、セット行間統一、セット番号デザイン改善、デフォルト3セット対応。UIロジックの整理とテスト追加が主な作業。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: React Navigation v7, NativeWind v4, Zustand (workoutSessionStore), @expo/vector-icons (Ionicons)
**Storage**: expo-sqlite（スキーマ変更なし）
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: iOS 16+ / Android 10+（Expo Go）
**Project Type**: mobile
**Performance Goals**: 60fps アニメーション維持
**Constraints**: Expo Go ネイティブモジュール制約に従う
**Scale/Scope**: 変更対象コンポーネント4ファイル + テスト4ファイル

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | チェック | 判定 |
|---|---|---|
| I. ローカルファースト | DBスキーマ変更なし。既存SQLiteへの読み書きのみ | ✅ 合格 |
| II. 引き算のデザイン | プレースホルダー削除・インライン前回記録削除など「削る」方向の変更。セット番号を丸バッジなし → テキストのみに簡素化 | ✅ 合格 |
| III. MVPスコープ厳守 | 既存機能のUI改善のみ。スコープ追加なし | ✅ 合格 |
| IV. マネージドサービス専用 | インフラ変更なし | ✅ 合格（N/A） |
| V. 個人開発の持続可能性 | 変更ファイル数は少なく複雑さを増やさない | ✅ 合格 |
| VI. テスト・品質規律 | TDD必須。新規コンポーネントに単体テスト追加。90%カバレッジ目標 | ✅ 合格予定 |

## Project Structure

### Documentation (this feature)

```text
specs/20260222-登録画面デザイン変更/
├── spec.md              ✅ 作成済み
├── plan.md              ✅ このファイル
├── research.md          ✅ 作成済み
└── tasks.md             （/speckit.tasks で生成予定）
```

### Source Code

```text
apps/mobile/src/
├── features/workout/
│   ├── components/
│   │   ├── ExerciseBlock.tsx         [変更] コピーボタン・削除ボタン追加
│   │   ├── SetRow.tsx                [変更] インライン前回記録削除・placeholder削除・セット番号デザイン
│   │   └── __tests__/
│   │       ├── ExerciseBlock.test.tsx  [新規] コンポーネントテスト
│   │       └── SetRow.test.tsx         [新規] コンポーネントテスト
│   ├── hooks/
│   │   └── useWorkoutSession.ts      [変更] addExercise デフォルト3セット
│   │       └── __tests__/
│   │           └── useWorkoutSession.test.ts  [更新] addExercise テスト追加
│   └── screens/
│       ├── RecordScreen.tsx          [変更] handleCopyAllPrevious実装・削除ハンドラー追加
│       └── __tests__/
│           └── RecordScreen.test.tsx  [更新] コピー・削除テスト追加
```

**Structure Decision**: モバイルアプリ単体。既存 features/workout/ 配下のコンポーネント・フック・画面を修正するのみ。新規ディレクトリ不要。

## 変更詳細

### 変更1: SetRow.tsx — インライン前回記録の削除とプレースホルダー削除

**目的**: FR-001（前回記録統合）・FR-004（プレースホルダー削除）・FR-006（行間統一）・FR-007（セット番号デザイン）

**削除対象**:
- L79-88: 前回記録インライン表示 View（`previousLabel && (...)`）
- `PreviousSetData` 型の `export`（ExerciseBlock側でも不要になるため確認後削除）
- `previousSet` prop
- `onCopyPrevious` prop
- `computePreviousLabel` 関数

**変更対象**:
- L104: `placeholder={previousSet?.weight?.toString() ?? '0'}` → `placeholder` を渡さない（空欄）
- L117: 同様に `reps` も削除
- L94-96: セット番号の丸バッジ → テキストラベル

**セット番号の新スタイル**:
```tsx
{/* セット番号: 丸バッジを廃止し、シンプルなテキストラベルに変更（入力欄との混同防止） */}
<Text style={{ width: 24, fontSize: 14, fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>
  {set.setNumber}
</Text>
```

---

### 変更2: ExerciseBlock.tsx — コピーボタン改善・削除ボタン追加・per-set コピー削除

**目的**: FR-002（コピーボタン）・FR-005（種目削除ボタン）・FR-001（per-set コピー削除）

**追加 props**:
```typescript
/** 種目を削除 */
onDeleteExercise: () => void;
```

**削除 props**:
- `onCopyPreviousSet: (setId: string, previousSet: PreviousSetData) => void`
- `getPreviousSetData` 関数
- `handleCopyPreviousSet` 関数（ラッパー）

**ヘッダーエリアの変更**:
```tsx
{/* ヘッダー右エリア: 削除ボタン + 前回バッジ（コピーアイコン付き） */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  {/* 種目削除ボタン */}
  <TouchableOpacity onPress={onDeleteExercise} accessibilityLabel={`${exercise.name}を削除`}>
    <Ionicons name="trash-outline" size={18} color="#94a3b8" />
  </TouchableOpacity>

  {/* 前回バッジ + コピーアイコン */}
  {previousBadgeText && (
    <TouchableOpacity
      onPress={onCopyAllPrevious}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F3F5' }}
      accessibilityLabel="前回の全セットをコピー"
    >
      <Text style={{ fontSize: 13, color: '#64748b' }}>{previousBadgeText}</Text>
      <Ionicons name="copy-outline" size={14} color="#64748b" />
    </TouchableOpacity>
  )}
</View>
```

**SetRow への props 変更**:
- `previousSet` と `onCopyPrevious` を渡さなくなる

---

### 変更3: RecordScreen.tsx — handleCopyAllPrevious 実装・削除ハンドラー追加

**目的**: FR-003（コピー実装）・FR-005（種目削除 UI 連携）

**ExerciseBlockWithPrevious の変更**:

```typescript
// 一括コピーのロジックを ExerciseBlockWithPrevious に持ち込む
// previousRecord は usePreviousRecord フックでこのスコープにある

const handleCopyAllPrevious = useCallback(() => {
  if (!previousRecord) return;
  // 現在の全セットに前回記録を一括コピー
  sets.forEach((set, i) => {
    const prevSet = previousRecord.sets[i];
    if (prevSet?.weight != null && prevSet?.reps != null) {
      onCopyPreviousSet(set.id, { weight: prevSet.weight, reps: prevSet.reps });
    }
  });
}, [previousRecord, sets, onCopyPreviousSet]);
```

**ExerciseBlockWithPrevious の新 props**:
```typescript
onDeleteExercise: (workoutExerciseId: string) => void;
onCopyPreviousSet: (setId: string, previousSet: PreviousSetData) => void;  // 引き続き使用
```

**RecordScreen の handleDeleteExercise 追加**:
```typescript
const handleDeleteExercise = useCallback(
  (workoutExerciseId: string) => {
    void session.removeExercise(workoutExerciseId);
  },
  [session],
);
```

**不要になる RecordScreen のハンドラー**:
- `handleCopyAllPrevious`（スタブ削除）→ ExerciseBlockWithPrevious 内に移動

---

### 変更4: useWorkoutSession.ts — デフォルト3セット

**目的**: FR-008（デフォルト3セット）

```typescript
// Before: 1セットのみ
const newSet = await SetRepository.create({
  workoutExerciseId: id,
  setNumber: 1,
});
store.setSetsForExercise(id, [newSet]);

// After: 3セットを並行作成
// addExercise 時のデフォルトセット数を3に変更（Issue #119: デフォルト3セット表示）
const initialSets = await Promise.all(
  [1, 2, 3].map((setNumber) => SetRepository.create({ workoutExerciseId: id, setNumber })),
);
store.setSetsForExercise(id, initialSets);
```

---

## TDD 実装順序

各変更は **Red → Green → Refactor** で実施する。

### T-01: SetRow の単体テスト（新規）
- プレースホルダーが表示されないこと
- 前回記録インラインが表示されないこと
- セット番号がテキスト形式で表示されること

### T-02: ExerciseBlock の単体テスト（新規）
- コピーボタンが表示・タップで `onCopyAllPrevious` 呼び出し
- 削除ボタン表示・タップで `onDeleteExercise` 呼び出し
- 前回記録なし時にコピーボタン非表示

### T-03: useWorkoutSession の addExercise テスト（更新）
- `addExercise` が3セット作成することを確認

### T-04: RecordScreen の統合テスト（更新）
- 一括コピーボタンで全セットに前回記録が入ること
- 種目削除ボタンで種目が消えること

## Complexity Tracking

> 違反なし。コンスティテューション全原則に準拠。
