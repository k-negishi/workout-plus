# Feature Specification: ホームヘッダー簡素化

**Feature Branch**: `main`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "おはようXXX と、右上の◯不要。その分上に詰める。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ヘッダーの不要要素を除去する (Priority: P1)

ホーム画面上部から「おはよう、トレーニー」挨拶テキストと右上の丸アイコンを削除し、視線ノイズを減らす。

**Why this priority**: 画面を開いた瞬間に不要情報が目に入り、主要情報（StreakCard）までの到達が遅れるため。

**Independent Test**: HomeScreen を表示し、挨拶文・丸アイコンが描画されないことを UI テストで確認する。

**Acceptance Scenarios**:

1. **Given** ホーム画面を表示している, **When** ヘッダーを確認する, **Then** 「おはよう/こんにちは/こんばんは、トレーニー」が表示されない
2. **Given** ホーム画面を表示している, **When** ヘッダー右上を確認する, **Then** 1文字アバターの丸アイコンが表示されない

---

### User Story 2 - 上詰めレイアウトを維持する (Priority: P1)

不要要素を削除したぶん、StreakCard がヘッダー上部に詰まって表示され、縦方向の無駄な空白が増えない。

**Why this priority**: Issue の主目的が「削除して上に詰める」ため、見た目の間延びを防ぐことが必須。

**Independent Test**: HomeScreen を表示し、StreakCard がヘッダー先頭コンテンツとして表示されることを確認する。

**Acceptance Scenarios**:

1. **Given** ホーム画面を表示している, **When** ヘッダー領域を確認する, **Then** StreakCard が先頭コンテンツとして表示される
2. **Given** ワークアウト 0 件, **When** ホーム画面を表示する, **Then** StreakCard は従来どおり表示される

### Edge Cases

- Safe Area が大きい端末（ノッチ/ダイナミックアイランド）でも、`paddingTop` によりヘッダーが欠けないこと
- 文字列依存テストが時間帯で不安定にならないよう、正規表現で挨拶語全体を検証すること

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: HomeScreen ヘッダーから時間帯挨拶テキストを削除しなければならない
- **FR-002**: HomeScreen ヘッダー右上の丸アイコンを削除しなければならない
- **FR-003**: 削除後は StreakCard がヘッダーの先頭表示要素にならなければならない
- **FR-004**: 既存のデータ取得・集計・ナビゲーション挙動を変更してはならない

### Key Entities

- **HomeHeader**: HomeScreen 上部のレイアウトブロック。今回の変更対象は表示要素のみ（挨拶行の除去）
- **StreakCard**: ヘッダーで継続表示される主要情報コンポーネント。位置のみ相対的に上へ移動

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `HomeScreen.test.tsx` にて挨拶文が未表示であることを自動テストで確認できる
- **SC-002**: `HomeScreen.test.tsx` にて StreakCard 表示が維持されることを確認できる
- **SC-003**: 対象テスト・lint・型チェックがすべて PASS する
