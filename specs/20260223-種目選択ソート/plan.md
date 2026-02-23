# Implementation Plan: 種目選択ソート

**Branch**: `20260223-種目選択ソート` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)

## Summary

種目選択画面（ExercisePickerScreen）にソートオプション（名前順・部位別・追加日順・よく使う順）を追加する。ソート状態は Zustand `exerciseStore` でセッション内保持し、`useExerciseSearch` の `computeSections` 関数にソートロジックを追加する。「よく使う順」のみ `workout_exercises` テーブルの集計クエリを新設する。既存のexercisesスキーマ変更はなし。

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React Native 0.81.5 (Expo SDK 52), Zustand, expo-sqlite ~15.2.0, @testing-library/react-native, Jest 29
**Storage**: SQLite（既存スキーマ変更なし。`workout_exercises` テーブルをJOINして使用回数集計）
**Testing**: Jest 29 + @testing-library/react-native（カバレッジ 90%以上必須）
**Target Platform**: iOS 16+ / Android 10+（Expo Go）
**Project Type**: Mobile
**Performance Goals**: ソート切り替え後 1 秒以内にリスト更新（SC-001）
**Constraints**: exercises テーブルスキーマ変更禁止。Expo SDK 52 互換。Hermes エンジン対応
**Scale/Scope**: 種目数 〜 100件程度（全種目取得 + JOIN で十分高速）

## Constitution Check

### 原則 I: ローカルファースト ✅

- ソート処理はすべてローカル（SQLite + JS）で完結
- オフラインでも全ソートオプションが動作する

### 原則 II: 引き算のデザイン ✅

- UIは水平スクロールチップ（最小限の追加要素）
- セクション数を増やすのではなく、既存セクションを整理・統合する方向
- グラデーションなし、シャドウなし、border-radius 6px

### 原則 III: MVP スコープ厳守 ✅

- スコープ: ソート選択UI + セッション内保持のみ
- 除外: ソート設定の永続化（AsyncStorage）、ドラッグ&ドロップ並び替え

### 原則 IV: マネージドサービス専用 ✅

- サーバーサイド処理なし（純粋なローカル機能）

### 原則 V: 個人開発の持続可能性 ✅

- 変更ファイル数: 6ファイル変更、4ファイル追加（適切なスコープ）
- 既存パターン（Zustand + Repository + Hook）を流用

### 原則 VI: テスト・品質規律 ✅

- 全新規ロジックに対してユニットテストを記述（TDD必須）
- `computeSections` は純粋関数のためテスト容易
- カバレッジ 90% 以上を維持

## Project Structure

### Documentation (this feature)

```text
specs/20260223-種目選択ソート/
├── spec.md             ✅
├── plan.md             ✅（このファイル）
├── research.md         ✅
├── data-model.md       ✅
├── quickstart.md       ✅
├── checklists/
│   └── requirements.md ✅
└── tasks.md            （/speckit.tasks で生成）
```

### Source Code (repository root)

```text
apps/mobile/src/
├── types/
│   └── exerciseSort.ts                                      # 新規: ExerciseSortOrder 型
├── stores/
│   └── exerciseStore.ts                                     # 変更: sortOrder 追加
├── database/repositories/
│   └── exercise.ts                                          # 変更: findAllWithUsageCount() 追加
├── features/exercise/
│   ├── components/
│   │   ├── ExerciseSortChips.tsx                           # 新規: ソートチップUI
│   │   └── __tests__/
│   │       └── ExerciseSortChips.test.tsx                  # 新規: UIテスト
│   ├── hooks/
│   │   ├── useExerciseSearch.ts                            # 変更: sortOrder 引数追加
│   │   └── __tests__/
│   │       └── useExerciseSearch.sortOrder.test.ts         # 新規: ソートロジックテスト
│   └── screens/
│       └── ExercisePickerScreen.tsx                        # 変更: ExerciseSortChips 組み込み
```

**Structure Decision**: 既存の mobile モノレポ構造（features/hooks/components/screens の 4 層）に従う。新規ファイルは既存ディレクトリに追加し、ディレクトリ構造を変更しない。

## Complexity Tracking

> Constitution Check 違反なし。追記不要。
