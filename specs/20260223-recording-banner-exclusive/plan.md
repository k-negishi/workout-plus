# 実装計画: 記録中バナーと記録ボタンの排他表示

## アーキテクチャ

変更は `HomeScreen.tsx` の JSX 条件レンダリング1箇所のみ。
既存の `isRecording` state を利用するため、状態管理・DB・ナビゲーションへの影響はゼロ。

## 変更箇所

### `apps/mobile/src/features/home/screens/HomeScreen.tsx`

**Before（L349-367）:**
```tsx
{/* T10: ワークアウト記録ボタン */}
<TouchableOpacity
  testID="record-workout-button"
  ...
```

**After:**
```tsx
{/* 記録中でないときのみワークアウト記録ボタンを表示する（記録中はバナーのみ） */}
{!isRecording && (
  <TouchableOpacity
    testID="record-workout-button"
    ...
  </TouchableOpacity>
)}
```

## リスク評価

- **リスク:** 極小。条件レンダリングの追加のみ
- **回帰リスク:** 記録ボタンが意図せず常に非表示になるケース → テストで検証
- **パフォーマンス:** 影響なし

## テスト戦略

TDD（Red → Green → Refactor）で進行：
1. **Red:** 排他表示の4パターンを検証するテストを追加（失敗を確認）
2. **Green:** `{!isRecording && (...)}` で条件レンダリングを実装
3. **Refactor:** 不要なコメント整理（必要に応じて）
