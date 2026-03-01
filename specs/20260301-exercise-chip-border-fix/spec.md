# 仕様書: 種目追加フォーム チップボタンのボーダー視認性修正

**Issue**: #205 (部位／器具の枠が外れている問題)
**Feature Dir**: `specs/20260301-exercise-chip-border-fix/`
**作成日**: 2026-03-01

---

## 概要

`ExercisePickerScreen` の新規種目作成フォーム内にある「部位」「器具」選択チップボタンのボーダーが視覚的に見えない問題を修正する。

## 現状の問題

- 未選択チップ: `borderColor: '#e2e8f0'`（非常に薄いグレー）+ `backgroundColor: 'white'` → 白地に白に近いボーダー → 実質不可視
- 選択チップ: `borderColor: '#4D94FF'`（青） + `backgroundColor: '#E6F2FF'` → これも境界が薄い場合がある
- 結果として「ボタン」ではなく「プレーンテキスト」に見える

## 修正方針

### ユーザーストーリー

> ユーザーが種目追加フォームを開いたとき、部位・器具の選択肢がボタン（ピル形状）として明確に認識できること

### 受け入れ条件

- [ ] 未選択チップが白背景上で視覚的にボタン形状として識別できる
- [ ] 選択チップが未選択と明確に区別できる（色の強調）
- [ ] 部位・器具チップともに同一スタイルで統一される
- [ ] 既存の機能（選択状態の変化、pressedフィードバック）は維持される

## 修正内容

### 変更ファイル
- `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx`

### スタイル変更

| 状態 | 変更前 | 変更後 |
|---|---|---|
| 未選択 背景色 | `'white'` | `'#F8FAFC'`（薄グレー背景） |
| 未選択 ボーダー色 | `'#e2e8f0'` | `'#CBD5E1'`（より視認性の高いグレー） |
| 選択 背景色 | `'#E6F2FF'` | `'#E6F2FF'`（変更なし） |
| 選択 ボーダー色 | `'#4D94FF'` | `'#4D94FF'`（変更なし） |
| pressed 背景色 | `'#D6EAFF'` | `'#D6EAFF'`（変更なし） |

### 対象コード位置
- `ExerciseListHeader` コンポーネント内（`ExercisePickerScreen.tsx` L183〜244）
- `MUSCLE_GROUP_OPTIONS` ループ（部位チップ）
- `EQUIPMENT_OPTIONS` ループ（器具チップ）

## テスト方針

- 既存テスト（`ExercisePickerScreen.test.tsx`）がパスすること
- 新規テスト: チップボタンにボーダーが設定されていることをスタイルから検証
  - 未選択時: `borderWidth: 1` かつ `borderColor: '#CBD5E1'`
  - 選択時: `borderWidth: 1` かつ `borderColor: '#4D94FF'`

## スコープ外

- カテゴリタブ（`全て・胸・背中...`）のスタイル変更（NativeWind で既に機能している）
- 種目リスト内バッジのスタイル変更
