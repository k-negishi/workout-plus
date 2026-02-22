# Research: 全体フォントサイズ 1 段階拡大

## 現行実装の分析

### typography.ts（トークン定義）

```typescript
// apps/mobile/src/shared/constants/typography.ts
export const fontSize = {
  xs:  12,  // キャプション・補足テキスト
  sm:  14,  // ラベル・セカンダリテキスト
  md:  16,  // 本文テキスト
  lg:  18,  // サブタイトル
  xl:  20,  // セクションタイトル
  xxl: 24,  // 画面タイトル
}
export const lineHeight = {
  xs: 16, sm: 20, md: 24, lg: 28, xl: 28, xxl: 32
}
```

### トークン参照コンポーネント（P1 で自動更新される）

| ファイル | 参照トークン |
|---------|------------|
| Button.tsx | fontSize.sm, fontSize.md |
| NumericInput.tsx | fontSize.sm, fontSize.xs |
| EmptyState.tsx | fontSize.lg, fontSize.sm |

### ハードコード箇所（P2 で手動更新が必要）

| ファイル | ハードコード値 |
|---------|--------------|
| HomeScreen.tsx | 12, 14, 20 |
| RecordScreen.tsx | 12, 14 |
| RecentWorkoutCard.tsx | 11, 12, 13, 15, 18 |
| QuickStatsWidget.tsx | 13, 28 |
| StreakCard.tsx（text-[32px]） | 32 |
| TimerBar.tsx | 10, 11, 13, 14, 16 |
| ExerciseBlock.tsx | 11, 12, 13, 16 |
| SetRow.tsx | 11, 12, 14 |
| DaySummary.tsx | 11, 13, 14, 15 |
| WeeklyGoalsWidget.tsx | 12, 13, 16, 24 |
| ExercisePickerScreen.tsx | 11, 14 |

## 影響を受けないファイル

- CalendarScreen.tsx - NativeWind text クラスのみ使用、フォントサイズ指定なし
- WorkoutDetailScreen.tsx - inline style でフォントサイズ未指定（フォーマット関数経由）
- WorkoutSummaryScreen.tsx - 要確認

## テスト方針

- fontSize の実際の値を検証するのではなく、コンポーネントが正常にレンダリングされることをテスト
- スナップショットテストは layoutによる差異のため更新が必要
- 型チェックで変更後のエラーがないことを確認

## 推定変更規模

- typography.ts: 1 ファイル（6 値 + 6 lineHeight）
- ハードコード修正: 11 ファイル（約 40〜50 か所）
- 合計: 12 ファイル
