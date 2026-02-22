# Feature Specification: 下部ナビゲーションの常時固定表示

**Feature Branch**: `20260222-fix-bottom-nav-always-visible`
**Created**: 2026-02-22
**Status**: Draft
**Input**: GitHub Issue #103 — どんな画面であっても、下メニューは必ず固定にする
**Related Issue**: https://github.com/k-negishi/workout-plus/issues/103

## 背景・問題

現在のナビゲーション構造において、`ExerciseHistoryFullScreen` は `RecordStack`（`RootNavigator` 直下）にのみ登録されている。このため、`HomeStack` 内の `WorkoutDetailScreen` から種目名をタップして `ExerciseHistory` 画面に遷移すると、`RecordStack` コンテキストで開かれてしまい、**BottomTabNavigator 管理外になりタブバーが非表示**になる。

```
RootNavigator (Stack)
├── MainTabs (BottomTab with CustomTabBar) ← タブバーあり
│   ├── HomeTab → HomeStack
│   │   ├── Home
│   │   ├── WorkoutDetail  ← ここから ExerciseHistory に遷移
│   │   └── WorkoutEdit
│   └── CalendarTab → CalendarStack
│       ├── Calendar
│       └── WorkoutDetail
└── RecordStack ← タブバーなし（問題）
    ├── Record
    ├── ExercisePicker
    ├── ExerciseHistory  ← 本来タブバーが必要な画面もここにしかない
    └── WorkoutSummary
```

## User Scenarios & Testing

### User Story 1 - ホームからの種目履歴閲覧 (Priority: P1)

ユーザーがホームタブ→過去のワークアウト詳細→種目名タップで種目履歴画面を開いたとき、BottomTabNavigator 内で遷移するため下部タブバーが表示され続ける。

**Why this priority**: コアナビゲーション導線。タブバーが消えることでユーザーが迷子になる。

**Independent Test**: HomeStack 内で ExerciseHistory に遷移したとき CustomTabBar が render されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** ホーム画面でワークアウト詳細を表示している, **When** 種目名をタップする, **Then** ExerciseHistory 画面が HomeStack 内で開かれ、下部タブバーが表示される
2. **Given** ExerciseHistory 画面を表示している, **When** 「戻る」をタップする, **Then** WorkoutDetail 画面に戻り、タブバーが引き続き表示される

---

### User Story 2 - カレンダーからの種目履歴閲覧 (Priority: P2)

ユーザーがカレンダータブ→過去のワークアウト詳細→種目名タップで種目履歴を開いたとき、CalendarStack 内で遷移してタブバーが表示される。

**Why this priority**: HomeStack と同様の問題が CalendarStack にも存在する。

**Independent Test**: CalendarStack 内で ExerciseHistory に遷移したとき CustomTabBar が render されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** カレンダー画面でワークアウト詳細を表示している, **When** 種目名をタップする, **Then** ExerciseHistory 画面が CalendarStack 内で開かれ、下部タブバーが表示される

---

### User Story 3 - 記録フローでの種目履歴閲覧 (Priority: P3)

ワークアウト記録中（RecordStack）に種目名をタップして種目履歴を開いた場合は、従来どおり RecordStack 内で遷移し、タブバーは非表示（記録フォーカスモード）。

**Why this priority**: 既存の記録フローを変更しないことで後退コストを最小化。

**Independent Test**: RecordStack 内での ExerciseHistory 遷移が従来と同じ動作（タブバーなし）。

**Acceptance Scenarios**:

1. **Given** ワークアウト記録中, **When** 種目履歴を開く, **Then** RecordStack コンテキストで開かれ、タブバーは非表示のまま

---

### Edge Cases

- `ExerciseHistoryFullScreen` が HomeStack / CalendarStack / RecordStack の3コンテキストで使われるため、型定義の競合が発生しないこと
- `WorkoutDetailScreen` は HomeStack と CalendarStack の両方で使われるが、それぞれの ExerciseHistory に正しく遷移できること

## Requirements

### Functional Requirements

- **FR-001**: `ExerciseHistoryFullScreen` を `HomeStack` に追加し、HomeStack 内での遷移を可能にする
- **FR-002**: `ExerciseHistoryFullScreen` を `CalendarStack` に追加し、CalendarStack 内での遷移を可能にする
- **FR-003**: `HomeStackParamList` と `CalendarStackParamList` に `ExerciseHistory` を追加する
- **FR-004**: `ExerciseHistoryFullScreen` の navigation/route 型を複数スタックに対応する汎用型に変更する（`goBack()` のみ使用するため `ParamListBase` で十分）
- **FR-005**: `WorkoutDetailScreen`（HomeStack・CalendarStack 両方から利用）が正しく ExerciseHistory に遷移できること
- **FR-006**: RecordStack の既存動作は変更しない

### Key Entities

- **ExerciseHistoryFullScreen**: 3スタック共通の種目履歴画面。route params は全スタック共通 `{ exerciseId: string; exerciseName: string }`
- **HomeStackParamList**: Home / WorkoutDetail / WorkoutEdit / ExerciseHistory を持つ
- **CalendarStackParamList**: Calendar / WorkoutDetail / ExerciseHistory を持つ

## Success Criteria

### Measurable Outcomes

- **SC-001**: HomeStack の WorkoutDetail → ExerciseHistory 遷移時、CustomTabBar が画面下部に表示される
- **SC-002**: CalendarStack の WorkoutDetail → ExerciseHistory 遷移時、CustomTabBar が画面下部に表示される
- **SC-003**: ExerciseHistory 画面で「戻る」をタップすると正しい前画面に戻れる
- **SC-004**: TypeScript コンパイルエラーが 0 件（`tsc --noEmit` が通る）
- **SC-005**: 既存テストがすべて PASS する
