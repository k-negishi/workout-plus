# Implementation Plan: ホームヘッダー簡素化

**Branch**: `main` | **Date**: 2026-02-21 | **Spec**: [specs/006-home-header-cleanup/spec.md](./spec.md)
**Input**: Feature specification from `specs/006-home-header-cleanup/spec.md`

## Summary

Issue #105 の要求どおり、Home 画面ヘッダーから挨拶文と右上丸アイコンを削除する。
表示の主役を `StreakCard` に絞り、削除分の縦スペースを詰める。ロジック・DB・ナビゲーションは変更しない。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5  
**Primary Dependencies**: React Navigation 7, React Native Testing Library, Jest  
**Storage**: SQLite（変更なし）  
**Testing**: Jest + @testing-library/react-native  
**Target Platform**: iOS / Android (Expo)  
**Project Type**: Mobile app (Expo managed)  
**Performance Goals**: UI 描画コスト増加なし（要素削減）  
**Constraints**: 既存 UI/データ集計の回帰を起こさない  
**Scale/Scope**: `HomeScreen.tsx` と `HomeScreen.test.tsx` の最小差分

## Constitution Check

- ローカルファースト: PASS（DB/通信変更なし）
- 引き算のデザイン: PASS（要素削除のみ）
- MVP スコープ厳守: PASS（Issue 要求範囲に限定）
- テスト規律: PASS（Red→Green で UI 要件を担保）

## Project Structure

### Documentation (this feature)

```text
specs/006-home-header-cleanup/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/mobile/src/features/home/screens/HomeScreen.tsx
apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx
```

**Structure Decision**: 既存 Mobile 構造に対する局所修正を採用。

## Complexity Tracking

該当なし（複雑性を増やす変更なし）。
