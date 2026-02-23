# 仕様書: セット間行間拡大 (Issue #128)

## 概要

ワークアウト記録画面のセット入力行間（SetRow 間）の余白を広くする。
現在の行間（gap: 8px）が詰まって見えるため、旧 WF 編集画面の行間相当に改善する。

## ユーザーストーリー

- **As a** ユーザー
- **I want** セット行の間隔が広い記録画面
- **So that** 各セット行が視覚的に分離されて読みやすく、タップミスが減る

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `ExerciseBlock.tsx` | セットリストコンテナの `gap` を `8 → 12` に変更 |
| `SetRow.tsx` | 行本体に `paddingVertical: 4` を追加（合計高さを増やす） |

## 受け入れ基準

1. `ExerciseBlock` のセットコンテナ `gap` が 12px 以上であること
2. `SetRow` 各行の垂直方向に視覚的余白があること
3. 既存テストがすべて通過すること
4. UI の見た目が WF 旧編集画面に近い行間になること

## デザイン詳細

- **現在**: `gap: 8`（ExerciseBlock のセットコンテナ）、`SetRow` 内 TextInput の `paddingVertical: 8`
- **変更後**: `gap: 12`（コンテナ）、`SetRow` 外枠 View に `paddingVertical: 4` 追加
- **効果**: 行間が 8px → 約 12px+8px（外padding）= より余裕のある見た目

## 対象コンポーネント

```
ExerciseBlock.tsx
  └── View (gap: 8 → 12)
        └── FlatList
              └── SetRow (各行に paddingVertical: 4 追加)
```

## 参考

- GitHub Issue: https://github.com/k-negishi/workout-plus/issues/128
- 現在の実装: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`
- 現在の実装: `apps/mobile/src/features/workout/components/SetRow.tsx`
