# Implementation Plan: +ボタンをワイヤーフレーム準拠に修正

**Branch**: `005-fix-plus-button-wf` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-fix-plus-button-wf/spec.md`

## Summary

Issue #101 の再現画像で確認できる「中央+ボタンがWF通りに表示されない」問題を解消する。`MainTabs` の中央アクションを WF の `add-button` 定義（56x56、青背景、4px境界、影、浮き位置）に一致させ、タップ時の `RecordStack` 遷移を維持する。TDD で `MainTabs` テストを追加し、回帰を防止する。

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 / React 19.1.0  
**Primary Dependencies**: Expo SDK 54, React Navigation v7, @testing-library/react-native, Jest 29  
**Storage**: N/A（UI修正のみ）  
**Testing**: Jest + React Native Testing Library  
**Target Platform**: iOS / Android（Expo managed）
**Project Type**: Mobile（apps/mobile）  
**Performance Goals**: タブ表示時に60fpsを維持、描画遅延を増やさない  
**Constraints**: 既存ナビゲーション構造を変更しない、WF準拠スタイルを厳守  
**Scale/Scope**: `MainTabs.tsx` と `MainTabs.test.tsx` 中心の小規模修正

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 評価 | 根拠 |
|---|---|---|
| I. ローカルファースト | ✅ 準拠 | ローカルデータ処理へ影響なし |
| II. 引き算のデザイン | ✅ 準拠 | WF定義のミニマルなタブバー表現に揃えるのみ |
| III. MVPスコープ厳守 | ✅ 準拠 | 対象はIssue #101の+ボタン不整合修正に限定 |
| IV. マネージドサービス専用 | ✅ N/A | サーバーサイド変更なし |
| V. 個人開発の持続可能性 | ✅ 準拠 | 変更点を2ファイルに限定し回帰テストを追加 |
| VI. テスト・品質規律 | ✅ 準拠 | 先にテストを追加し、Jestで検証する |

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-plus-button-wf/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-navigation-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/mobile/src/app/
├── MainTabs.tsx
└── __tests__/MainTabs.test.tsx
```

**Structure Decision**: モバイル既存構成を維持し、`MainTabs` とそのテストに絞って修正する。

## Complexity Tracking

なし（コンスティテューション違反なし）
