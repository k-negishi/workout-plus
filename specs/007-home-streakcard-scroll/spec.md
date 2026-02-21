# Feature Specification: ホーム画面 StreakCard 固定解除

**Feature Branch**: `main`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "ホーム画面で、StreakCard がスクロールしても固定のまま"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - StreakCard がコンテンツと一緒にスクロールする (Priority: P1)

ホーム画面を下にスクロールしたとき、StreakCard が画面上部に固定されず、他コンテンツと同様にスクロールアウトする。

**Why this priority**: 現状は StreakCard が固定表示され、一覧閲覧時に縦方向の表示領域を圧迫するため。

**Independent Test**: HomeScreen テストで、StreakCard のラベル（「今月のトレーニング」）が ScrollView 内に存在することを確認する。

**Acceptance Scenarios**:

1. **Given** ホーム画面を表示している, **When** 下方向にスクロールする, **Then** StreakCard は固定されず他要素と一緒に移動する
2. **Given** ホーム画面を表示している, **When** StreakCard のレンダリング位置を確認する, **Then** ScrollView 内の先頭ブロックとして描画される

---

### User Story 2 - 既存の表示・集計挙動を維持する (Priority: P1)

固定解除後も、StreakCard 表示、最近のトレーニング表示、集計ロジックは回帰しない。

**Why this priority**: レイアウト修正が目的であり、データロジックの退行は許容できないため。

**Independent Test**: 既存 HomeScreen テスト（空データ、discarded 表示など）が継続して PASS することを確認する。

**Acceptance Scenarios**:

1. **Given** ワークアウト 0 件, **When** ホーム画面を表示する, **Then** StreakCard は表示される
2. **Given** `timer_status=discarded` のデータ, **When** ホーム画面を表示する, **Then** 既存どおり「―」表示が行われる

### Edge Cases

- Safe Area が大きい端末でも、StreakCard 上端が欠けないこと
- スクロール先頭復帰時に StreakCard が正しい位置へ戻ること

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: HomeScreen の StreakCard を ScrollView 外の固定領域ではなく ScrollView 内に配置しなければならない
- **FR-002**: ScrollView 内で StreakCard は先頭表示要素でなければならない
- **FR-003**: 既存のデータ取得・集計・ナビゲーション挙動を変更してはならない

### Key Entities

- **HomeScrollContent**: HomeScreen のスクロール可能領域。StreakCard と本文を内包する
- **StreakCard**: 今月トレーニング日数を示すカード。配置位置のみ変更し、表示ロジックは維持

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `HomeScreen.test.tsx` に「StreakCard が ScrollView 内に配置される」テストが追加され PASS する
- **SC-002**: 既存 HomeScreen テストがすべて PASS する
- **SC-003**: lint と型チェック結果を記録し、失敗時は原因を明示する
