# Implementation Plan: 全体フォントサイズ 1 段階拡大（Issue #118）

**Branch**: `20260222-フォントサイズ拡大` | **Date**: 2026-02-22 | **Spec**: `specs/20260222-フォントサイズ拡大/spec.md`

## Summary

iPhone での可読性改善のため、全フォントサイズを一律 +2px する。
中央集権トークン（`typography.ts`）の変更（P1）と、ハードコード箇所の一括修正（P2）の 2 フェーズ構成。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: NativeWind v4, @testing-library/react-native, Jest 29
**Storage**: N/A（UI 変更のみ）
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: iOS / Android (Expo Go)
**Performance Goals**: N/A
**Constraints**: Expo SDK 52 の制約に準拠
**Scale/Scope**: 12 ファイル、約 50 か所の変更

## Project Structure

```text
apps/mobile/src/
├── shared/constants/
│   └── typography.ts              # P1: トークン値更新（メイン変更ファイル）
├── shared/components/
│   ├── Button.tsx                 # トークン参照 → 自動更新
│   ├── EmptyState.tsx             # トークン参照 → 自動更新
│   └── NumericInput.tsx           # トークン参照 → 自動更新
├── features/
│   ├── home/
│   │   ├── screens/HomeScreen.tsx               # P2: ハードコード修正
│   │   └── components/
│   │       ├── RecentWorkoutCard.tsx             # P2: ハードコード修正
│   │       ├── QuickStatsWidget.tsx              # P2: ハードコード修正
│   │       ├── WeeklyGoalsWidget.tsx             # P2: ハードコード修正
│   │       └── StreakCard.tsx                    # P2: ハードコード修正
│   ├── calendar/components/
│   │   └── DaySummary.tsx                       # P2: ハードコード修正
│   ├── workout/
│   │   ├── screens/RecordScreen.tsx             # P2: ハードコード修正
│   │   └── components/
│   │       ├── TimerBar.tsx                     # P2: ハードコード修正
│   │       ├── ExerciseBlock.tsx                # P2: ハードコード修正
│   │       └── SetRow.tsx                       # P2: ハードコード修正
│   └── exercise/screens/
│       └── ExercisePickerScreen.tsx             # P2: ハードコード修正
specs/20260222-フォントサイズ拡大/
├── spec.md
├── plan.md            # This file
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md           # /speckit.tasks で生成
```

## 変更方針

### Phase 1: typography.ts トークン更新

変更前後マッピング:

| キー | 前 | 後 | lineHeight 前 | lineHeight 後 |
|------|----|----|--------------|--------------|
| xs   | 12 | 14 | 16           | 20           |
| sm   | 14 | 16 | 20           | 24           |
| md   | 16 | 18 | 24           | 28           |
| lg   | 18 | 20 | 28           | 32           |
| xl   | 20 | 22 | 28           | 32           |
| xxl  | 24 | 26 | 32           | 36           |

### Phase 2: ハードコード値の一括 +2px

変更前後マッピング（全コンポーネント共通）:

| 変更前 | 変更後 |
|--------|--------|
| 10     | 12     |
| 11     | 13     |
| 12     | 14     |
| 13     | 15     |
| 14     | 16     |
| 15     | 17     |
| 16     | 18     |
| 18     | 20     |
| 20     | 22     |
| 24     | 26     |
| 28     | 30     |
| 32     | 34     |

**NativeWind クラス**: `text-[Npx]` 形式も +2px

## TDD 戦略

この変更は UI のフォントサイズのみのため、以下のテスト方針とする：
1. **既存テストのパス確認** - 全テストが変更後もパスすること
2. **スナップショット更新** - レイアウト変化のためスナップショットは `--updateSnapshot` で更新
3. **型チェック** - `tsc --noEmit` でエラーゼロ確認
4. **新規テストは不要** - フォントサイズの数値変更に対するユニットテストは ROI が低い

## Complexity Tracking

| 課題 | 対処 |
|------|------|
| ハードコード値が多い | Grep で全箇所を特定し一括置換 |
| NativeWind className も変更対象 | `text-\[Npx\]` パターンで Grep |
