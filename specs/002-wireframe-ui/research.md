# Research: ワイヤーフレーム準拠 UI 実装

**Date**: 2026-02-21

---

## 決定事項

### 1. タブバーへの AI タブ追加

**決定**: `MainTabs.tsx` の `@react-navigation/bottom-tabs` に 5 番目の `Tab.Screen` を追加し、`AIScreen`（プレースホルダー）へ接続する

**根拠**: 既存の `bottom-tabs` v7 構成をそのまま流用できる。新規ライブラリ不要。

**検討した代替案**: なし（既存パターンの拡張のみ）

---

### 2. SafeArea 実装

**決定**: `useSafeAreaInsets()` を使用して動的に安全領域を取得する。`paddingTop: insets.top`（ヘッダー）、`paddingBottom: insets.bottom`（コンテンツ下部）

**根拠**: `react-native-safe-area-context ~5.6.0` が既に依存に含まれており追加コスト不要。`SafeAreaView` ではなく `useSafeAreaInsets` を選ぶ理由は、ヘッダー背景色の描画範囲とコンテンツの余白を個別制御できるため。

**検討した代替案**:
- `SafeAreaView` ラッパー: ヘッダー背景が SafeArea 外まで伸びないケースで不適
- `pt-10` 固定値（現状）: デバイス依存で不正確。iPhone 以外で余白が崩れる

---

### 3. ExerciseHistory エントリーポイント

**決定**: `HomeStackParamList` と `CalendarStackParamList` に `ExerciseHistory: { exerciseId: string; exerciseName: string }` ルートを追加し、RecordScreen・WorkoutDetailScreen の種目名タップハンドラーから遷移する

**根拠**: `RecordStackParamList` には既に `ExerciseHistory` ルートが存在する。HomeStack・CalendarStack にも同じルートを追加するだけで既存の `ExerciseHistoryFullScreen` コンポーネントを再利用できる。

**検討した代替案**:
- RecordStack からのみアクセス: WorkoutDetailScreen（HomeStack/CalendarStack 配下）からアクセス不可になる
- 共通モーダルとして RootStack に追加: オーバーエンジニアリング。スタックごとに追加する方がシンプル

---

### 4. ExercisePicker 検索 0 件の空状態

**決定**: 既存の `shared/components/EmptyState.tsx` を再利用し、「該当する種目が見つかりません」テキストを中央表示する

**根拠**: プロジェクトに既存の `EmptyState` 共有コンポーネントがある。新規コンポーネント不要。

---

### 5. StreakCard 7 日インジケーター

**決定**: 各日を `View`（`borderRadius: 14`）で表示。完了: `backgroundColor: '#4D94FF'`（28×28px）、休息: `backgroundColor: '#e2e8f0'`（28×28px）。曜日ラベルなし。チェックマーク SVG も不要（仕様確定）

**根拠**: ワイヤーフレームの `.streak-day-circle.done / .rest` を React Native `View` + `StyleSheet` で忠実に実装。SVG 依存を減らしシンプルに保つ。

**検討した代替案**:
- SVG チェックマーク付き（ワイヤーフレーム元の形式）: ユーザー確認で曜日ラベルなし・シンプル形式に確定。SVG は不要

---

### 6. 統計画面プレースホルダー

**決定**: 既存の `StatsScreen` を確認し「準備中」表示がない場合のみ追加。AIScreen と同じパターンで実装

**根拠**: ナビゲーション調査で `StatsTab → StatsScreen（プレースホルダー）` として既存確認済み。

---

### 7. RecordScreen EmptyState（種目未追加時）

**決定**: 種目リストが空のとき `EmptyState` コンポーネントを使用し「種目を追加してください」と「+ 種目を追加」ボタンを中央表示

**根拠**: `shared/components/EmptyState.tsx` が存在する。ホーム画面の EmptyState と同パターンで一貫性を保てる。

---

## 技術的な補足メモ

### ワイヤーフレーム参照行番号

| 画面 | 開始行 |
|------|--------|
| CSS（全画面共通スタイル） | 1〜2901 |
| screen-home | 2903 |
| screen-record | 3128 |
| screen-picker | 3362 |
| screen-history-full | 3654 |
| screen-calendar | 3817 |
| screen-stats | 3924 |
| screen-summary | 4029 |
| screen-workout-detail | 4118 |

### 注意点: @gorhom/bottom-sheet

`@gorhom/bottom-sheet ^5.2.8` が依存に含まれているが、ExerciseHistory をフルスクリーンに変更したため本フィーチャーでは使用しない。将来的なボトムシート系 UI のために残置。
