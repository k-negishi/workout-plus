# 実装計画: 種目追加フォーム チップボタンのボーダー視認性修正

## アーキテクチャ概要

変更対象は `ExercisePickerScreen.tsx` の `ExerciseListHeader` コンポーネント内のみ。
UI スタイルの微調整であり、ロジック・状態管理・API の変更は一切不要。

## 依存関係

```
ExercisePickerScreen.tsx
  └─ ExerciseListHeader (React.memo)
       ├─ MUSCLE_GROUP_OPTIONS チップ（部位選択）← 変更対象
       └─ EQUIPMENT_OPTIONS チップ（器具選択）← 変更対象
```

## 実装方針

### 変更箇所

**ファイル**: `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx`

**変更内容**: `ExerciseListHeader` 内の Pressable の `style` 関数で、未選択時の背景色とボーダー色を変更する。

```tsx
// Before（未選択時が不可視）
borderColor: newMuscleGroup === opt.key ? '#4D94FF' : '#e2e8f0',
backgroundColor: pressed
  ? '#D6EAFF'
  : newMuscleGroup === opt.key
    ? '#E6F2FF'
    : 'white',

// After（未選択時を視認可能に）
borderColor: newMuscleGroup === opt.key ? '#4D94FF' : '#CBD5E1',
backgroundColor: pressed
  ? '#D6EAFF'
  : newMuscleGroup === opt.key
    ? '#E6F2FF'
    : '#F8FAFC',
```

同様に器具チップ（`newEquipment`）も同一の変更を適用。

### TDD アプローチ

1. **Red**: テストを先に書く（チップのスタイルを検証するテストケース追加）
2. **Green**: スタイル修正を実装
3. **Refactor**: 重複なし・スタイル定数抽出不要（既に定数化されていない）

## リスク・考慮事項

- `React.memo` による再レンダリング制御は維持（ props が変われば再レンダリングされる）
- `borderColor: '#CBD5E1'` は既存のデザインシステム内の色（border系の標準）
- `backgroundColor: '#F8FAFC'` は背景グループの色（`bg-[#F8FAFC]` として他所でも使用）
- 変更は純粋なビジュアル修正のため機能テストへの影響なし
