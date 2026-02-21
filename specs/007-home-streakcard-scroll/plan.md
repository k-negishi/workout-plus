# Implementation Plan: ホーム画面 StreakCard 固定解除

**Branch**: `main` | **Date**: 2026-02-21 | **Spec**: [specs/007-home-streakcard-scroll/spec.md](./spec.md)
**Input**: Feature specification from `specs/007-home-streakcard-scroll/spec.md`

## Summary

Issue #102 の要求に合わせ、HomeScreen で固定表示されている StreakCard をスクロール領域内へ移動する。
見た目のヘッダー装飾（背景色・境界線・SafeArea padding）は維持しつつ、レイアウトのみ変更する。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5  
**Primary Dependencies**: React Navigation 7, React Native Testing Library, Jest  
**Storage**: SQLite（変更なし）  
**Testing**: Jest + @testing-library/react-native  
**Target Platform**: iOS / Android (Expo)  
**Project Type**: Mobile app (Expo managed)  
**Performance Goals**: 固定領域削減で可視領域を確保しつつ、描画コスト増を避ける  
**Constraints**: 既存集計・ナビゲーション・表示文言を変更しない  
**Scale/Scope**: `HomeScreen.tsx` と `HomeScreen.test.tsx` の局所修正

## Constitution Check

- ローカルファースト: PASS（DB/同期処理変更なし）
- 引き算のデザイン: PASS（固定ヘッダーをやめて単純化）
- MVP スコープ厳守: PASS（Issue #102 の症状修正に限定）
- テスト規律: PASS（Red→Greenで配置要件を追加）

## Project Structure

### Documentation (this feature)

```text
specs/007-home-streakcard-scroll/
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

**Structure Decision**: 既存 Home 構造に対して、固定ヘッダーを ScrollView 内へ再配置する最小変更を採用。

## Complexity Tracking

該当なし（新規状態管理やデータモデル追加なし）。
