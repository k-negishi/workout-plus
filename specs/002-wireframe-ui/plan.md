# Implementation Plan: ワイヤーフレーム準拠 UI 実装

**Branch**: `main` | **Date**: 2026-02-21 | **Spec**: [specs/002-wireframe-ui/spec.md](./spec.md)

---

## Summary

MVPスクリーン全 8 画面（+ タブバー）を `requirements/adopted/workout_plus_wireframes_v5_md3.html` のビジュアルデザインに準拠させる。既存の機能実装（データ取得・ストア・DB・ナビゲーション）は変更しない。

主要変更:
1. **タブバー**: 4 タブ → 5 タブ（AI タブ追加）
2. **SafeArea**: 固定 `pt-10` → `useSafeAreaInsets` による動的取得（全スクリーン）
3. **各画面 UI 修正**: StreakCard インジケーター・ExerciseHistory エントリーポイント・空状態対応・PR 0 件非表示

---

## Technical Context

**Language/Version**: TypeScript / React Native 0.81.5
**Primary Dependencies**: @react-navigation/bottom-tabs v7, @react-navigation/native-stack v7, NativeWind v4, react-native-safe-area-context ~5.6.0
**Storage**: expo-sqlite（変更なし）
**Testing**: Jest + React Native Testing Library、カバレッジ目標 90%+
**Target Platform**: iOS 16+ / Android 10+（Expo Go）
**Project Type**: Mobile（Expo managed workflow）
**Performance Goals**: N/A（ビジュアル層のみ）
**Constraints**: Expo Go（ネイティブモジュール追加不可）、ビジュアル層のみ変更
**Scale/Scope**: 8 画面 + タブバー、変更対象コンポーネント約 15 ファイル

---

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. ローカルファースト | ✅ PASS | データ取得・ストア・DB 変更なし |
| II. 引き算のデザイン | ✅ PASS | ワイヤーフレーム準拠。余分な装飾追加なし |
| III. MVPスコープ厳守 | ✅ PASS | 定義済み 8 画面のビジュアル修正のみ |
| IV. マネージドサービス | N/A | モバイルのみ |
| V. 個人開発持続可能性 | ✅ PASS | 既存構造最大活用。新規ファイルは AIScreen.tsx 1 件のみ |
| VI. テスト・品質規律 | ✅ PASS | 変更コンポーネントごとに単体テスト必須（スナップショットなし） |

**Complexity Tracking**: 違反なし、記録不要

---

## Project Structure

### Documentation (this feature)

```text
specs/002-wireframe-ui/
├── plan.md              ← 本ファイル
├── research.md          ← Phase 0 出力
├── data-model.md        ← ナビゲーション型変更のみ記録
├── checklists/
│   └── requirements.md
└── tasks.md             ← /speckit.tasks で生成（未作成）
```

### Source Code（変更対象ファイル）

```text
apps/mobile/src/
├── app/
│   ├── MainTabs.tsx                              # AI タブ（5番目）追加
│   ├── HomeStack.tsx                             # ExerciseHistory ルート追加
│   ├── CalendarStack.tsx                         # ExerciseHistory ルート追加
│   └── screens/
│       └── AIScreen.tsx                          # 新規作成（プレースホルダー）
├── types/
│   └── navigation.ts                             # AITab・ExerciseHistory ルート追加
├── features/
│   ├── home/
│   │   ├── screens/HomeScreen.tsx                # SafeArea 修正、UI 微調整
│   │   └── components/StreakCard.tsx             # 7日インジケーター形式修正
│   ├── calendar/
│   │   └── screens/CalendarScreen.tsx           # SafeArea 修正、UI 確認
│   ├── exercise/
│   │   ├── screens/ExercisePickerScreen.tsx     # 検索 0 件空状態追加・SafeArea
│   │   └── screens/ExerciseHistoryFullScreen.tsx # SafeArea 確認
│   └── workout/
│       ├── screens/RecordScreen.tsx              # EmptyState・種目名タップ→ExerciseHistory・SafeArea
│       ├── screens/WorkoutDetailScreen.tsx       # 種目名タップ→ExerciseHistory・SafeArea
│       ├── screens/WorkoutSummaryScreen.tsx      # PR 0 件時「新記録達成」セクション非表示
│       └── components/TimerBar.tsx               # SafeArea 対応確認
```

---

## Implementation Phases

### Phase A — タブバー + ナビゲーション基盤（P1・ブロッカー）

**目的**: 5 タブ構成を確立し、ExerciseHistory エントリーポイントをナビゲーション型に追加する。Phase D・E はこの Phase 完了後に着手。Phase B・F とは並列実行可。

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `types/navigation.ts` | `MainTabParamList` に `AITab: undefined` 追加。`HomeStackParamList`・`CalendarStackParamList` に `ExerciseHistory: { exerciseId: string; exerciseName: string }` 追加 |
| `app/MainTabs.tsx` | `Tab.Screen name="AITab"` を 5 番目に追加。`tabBarLabel: 'AI'`、`tabBarIcon: 'chatbubble-outline'`（Ionicons） |
| `app/screens/AIScreen.tsx` | 新規作成。「準備中」テキストを中央に表示するプレースホルダー画面 |
| `app/HomeStack.tsx` | `ExerciseHistoryFullScreen` への `ExerciseHistory` ルート追加 |
| `app/CalendarStack.tsx` | `ExerciseHistoryFullScreen` への `ExerciseHistory` ルート追加 |

**テスト**:
- `MainTabs`: タブ数 5・各タブのラベル・アイコンを検証
- `AIScreen`: 「準備中」テキストの存在を検証

---

### Phase B — SafeArea 全スクリーン対応（P1・独立）

**目的**: `pt-10` 固定値を `useSafeAreaInsets` に置き換え、全デバイスで正しい安全領域を取得する。Phase A・F と並列実行可。

**実装パターン**（全スクリーン共通）:
```typescript
const insets = useSafeAreaInsets();
// ヘッダー: paddingTop: insets.top + [既存の上部パディング]
// コンテンツ下部: paddingBottom: insets.bottom
```

**変更ファイル**（各スクリーン独立して実装可）:

| ファイル | 変更箇所 |
|---------|---------|
| `HomeScreen.tsx` | ヘッダー `paddingTop` を動的取得 |
| `CalendarScreen.tsx` | ヘッダー `paddingTop` を動的取得 |
| `RecordScreen.tsx` | ヘッダー `paddingTop` を動的取得 |
| `WorkoutDetailScreen.tsx` | ヘッダー `paddingTop` を動的取得 |
| `WorkoutSummaryScreen.tsx` | ヘッダー `paddingTop` を動的取得 |
| `ExercisePickerScreen.tsx` | モーダルヘッダー `paddingTop` を動的取得 |
| `ExerciseHistoryFullScreen.tsx` | フルスクリーンヘッダー `paddingTop` を動的取得 |
| `TimerBar.tsx` | ステータスバーとの重なりを `insets.top` で回避（要確認） |

**テスト**:
- 各スクリーンで `useSafeAreaInsets` が呼ばれることをモックで検証（`jest.mock('react-native-safe-area-context')`）

---

### Phase C — ホーム画面 UI（P2・Phase B 完了後推奨）

**ワイヤーフレーム参照**: `screen-home`（2903行〜）

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `StreakCard.tsx` | 7日インジケーターを塗りつぶし小円に修正（完了: `#4D94FF`・28×28px、休息: `#e2e8f0`・28×28px、曜日ラベルなし、チェックマークなし） |
| `HomeScreen.tsx` | ワイヤーフレームと照合し、ヘッダー・StreakCard・最近のトレーニングカード・ダッシュボードウィジェットの UI を調整 |

**テスト**:
- `StreakCard`: `done` props で `#4D94FF` 円が 7 個、`rest` props で `#e2e8f0` 円が 7 個レンダリングされることを検証

---

### Phase D — 記録フロー UI（P2・Phase A 完了後）

**ワイヤーフレーム参照**: `screen-record`（3128行〜）、`screen-picker`（3362行〜）、`screen-history-full`（3654行〜）

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `RecordScreen.tsx` | 種目未追加の初期状態に `EmptyState`（「+ 種目を追加」ボタン）を追加。種目名タップ → `navigation.push('ExerciseHistory', { exerciseId, exerciseName })` |
| `ExercisePickerScreen.tsx` | 検索結果 0 件時に `EmptyState`「該当する種目が見つかりません」を中央表示 |
| `ExerciseHistoryFullScreen.tsx` | ワイヤーフレームと照合してUI修正（統計グリッド・グラフ・履歴リスト） |

**テスト**:
- `RecordScreen`: `exercises` が空配列のとき `EmptyState` が表示されることを検証
- `ExercisePickerScreen`: `searchResults` が空配列のとき空状態テキストが表示されることを検証

---

### Phase E — カレンダー・詳細画面 UI（P2・Phase A 完了後）

**ワイヤーフレーム参照**: `screen-calendar`（3817行〜）、`screen-workout-detail`（4118行〜）

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `CalendarScreen.tsx` | ワイヤーフレームと照合して UI 確認・修正（トレーニングドット・詳細サマリー表示） |
| `WorkoutDetailScreen.tsx` | 種目名タップ → `navigation.push('ExerciseHistory', { exerciseId, exerciseName })` |

**テスト**:
- `WorkoutDetailScreen`: 種目名タップで `navigation.push('ExerciseHistory', ...)` が呼ばれることを検証

---

### Phase F — 完了サマリー + 統計プレースホルダー（P2・独立）

**ワイヤーフレーム参照**: `screen-summary`（4029行〜）、`screen-stats`（3924行〜）

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `WorkoutSummaryScreen.tsx` | PR 達成種目が 0 件のとき「新記録達成」セクションを非表示（条件付きレンダリング） |
| `StatsScreen.tsx` | 「準備中」表示がない場合のみ追加（AIScreen と同パターン） |

**テスト**:
- `WorkoutSummaryScreen`: `personalRecords` が空配列のとき「新記録達成」セクションが非表示になることを検証

---

## 依存関係グラフ

```
Phase A（タブバー + ナビゲーション）← 最優先
    ├── Phase D（記録フロー）
    └── Phase E（カレンダー・詳細）

Phase B（SafeArea）← Phase A と並列実行可
Phase C（ホーム画面）← Phase B 完了後推奨、実質 Phase A と並列実行可
Phase F（サマリー + 統計）← Phase A と並列実行可

並列実行パターン（5エージェント構成）:
  Agent 1: Phase A（タブバー + ナビゲーション型）
  Agent 2: Phase B（SafeArea: Home, Calendar, Record）
  Agent 3: Phase B（SafeArea: WorkoutDetail, Summary, ExercisePicker, ExerciseHistory, TimerBar）
  Agent 4: Phase C（ホーム画面 UI）+ Phase F（サマリー + 統計）
  Agent 5: Phase D（記録フロー UI）← Phase A 完了後に開始
```

---

## ワイヤーフレーム参照

**ファイル**: `requirements/adopted/workout_plus_wireframes_v5_md3.html`

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
