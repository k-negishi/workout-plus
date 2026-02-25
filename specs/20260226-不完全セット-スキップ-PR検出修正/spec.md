# Feature Specification: 不完全セット自動スキップ・PR検出の reps=0 除外

**Feature Branch**: `20260226-不完全セット-スキップ-PR検出修正`
**Created**: 2026-02-26
**Status**: Draft
**Input**: User description: "RecordScreen 空入力バリデーション: 不完全セットの自動スキップ と PR検出の reps=0 除外"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 片方だけ入力されたセットが完了時に自動除外される (Priority: P1)

ユーザーが記録画面でベンチプレス3セット目の重量（80kg）を入力したまま、レップ数を入力し忘れてワークアウトを完了した場合、その不完全なセット（weight=80, reps=未入力）はデータとして保存されない。

**Why this priority**: 不完全セットがDBに残ると、前回記録の表示・統計・1RM計算の信頼性が損なわれる。データ品質の根幹に関わるため最優先。

**Independent Test**: 記録画面でセットに片方だけ値を入力し完了ボタンを押す。ワークアウトサマリーおよびその後の記録でその不完全セットが表示されないことを確認することで独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** weight=80・reps=未入力のセットが存在する状態で、**When** ワークアウトを完了する、**Then** そのセットはワークアウト記録に含まれない
2. **Given** weight=未入力・reps=10のセットが存在する状態で、**When** ワークアウトを完了する、**Then** そのセットはワークアウト記録に含まれない
3. **Given** weight=80・reps=10の完全なセットと weight=未入力・reps=10の不完全なセットが混在する状態で、**When** ワークアウトを完了する、**Then** 完全なセットのみが記録に含まれる

---

### User Story 2 - reps=0 のセットで PR が誤判定されない (Priority: P1)

ユーザーが reps（レップ数）に 0 を入力したまま重量（例: 80kg）を入力してワークアウトを完了した場合、「最大重量 80kg を達成」として PR（自己記録）が誤って記録されない。

**Why this priority**: reps=0 は実質的に「未実施のセット」であり、これを PR として記録するとユーザーの記録データが不正確になる。Story 1 と同等の重要度。

**Independent Test**: reps=0・weight=80kg のセットを含むワークアウトを完了する。その後の PR 一覧に 80kg の max_weight PR が追加されていないことを確認することで独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** weight=80・reps=0のセットのみが存在する状態で、**When** ワークアウトを完了する、**Then** max_weight PRは更新されない
2. **Given** weight=80・reps=0のセットと weight=70・reps=10の正常なセットが混在する状態で、**When** ワークアウトを完了する、**Then** max_weight PRは70kgを基準に判定される（reps=0のセットは除外）
3. **Given** reps=0のセットのみが存在する状態で、**When** ワークアウトを完了する、**Then** max_reps PRも更新されない

---

### Edge Cases

- reps=0 かつ weight も 0 のセットはどう扱うか？ → 「両方未入力相当」と同等で完了時に除外される
- 全セットが不完全だった種目はどうなるか？ → セットが除外されても種目（workout_exercises）のレコード自体は残る（今回のスコープ外）
- weight=0・reps=10（自重種目）のセットは除外されるか？ → 除外されない。reps が正の値であれば完全なセットとして有効

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: ワークアウト完了時に、weight が未入力（null）のセットは記録から除外されなければならない
- **FR-002**: ワークアウト完了時に、reps が未入力（null）のセットは記録から除外されなければならない
- **FR-003**: ワークアウト完了時に、reps=0 かつ weight が入力済みのセットは記録から除外されなければならない
- **FR-004**: PR（自己記録）の検出において、reps=0 のセットは max_weight・max_reps・max_volume のいずれの PR 判定にも使用してはならない
- **FR-005**: weight=0 かつ reps が正の値のセット（自重種目）は有効として記録されなければならない
- **FR-006**: 既存の「weight=null かつ reps=null」の両方未入力セット除外の挙動は変更されてはならない（後退防止）

### Key Entities

- **WorkoutSet**: ワークアウト内の1セットの記録。weight・reps が両方有効値（reps > 0）の場合のみ「完全なセット」として扱う
- **PersonalRecord**: ユーザーが達成した自己記録（max_weight / max_reps / max_volume）。完全なセットのみを基に算出する

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 不完全なセット（片方 null、または reps=0 かつ weight 入力済み）を含むワークアウトを完了した際、それらのセットがワークアウト記録に一切含まれない
- **SC-002**: reps=0 のセットを含むワークアウトを完了した後、そのセットの重量が max_weight PR として記録されない
- **SC-003**: weight=0・reps=N（N>0）の自重種目セットは完了後も正常に記録として保持される
- **SC-004**: 完全なセット（weight が null でなく・reps > 0）は除外対象にならず、すべて正常に記録される

## Assumptions

- 今回のスコープは `completeWorkout()` の削除条件と PR 検出フィルタの2箇所のみ
- Alert 警告 UI・DB CHECK 制約追加・空種目の自動削除は今回のスコープ外
- weight=0 は自重種目として有効な値とみなす
- reps=0 は「未実施」として無効な値とみなす
