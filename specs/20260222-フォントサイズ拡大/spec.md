# Feature Specification: 全体フォントサイズ 1 段階拡大（Issue #118）

**Feature Branch**: `20260222-フォントサイズ拡大`
**Created**: 2026-02-22
**Status**: Draft
**Input**: https://github.com/k-negishi/workout-plus/issues/118

## 背景

iPhone の実機で文字が読みにくいとの報告。全体的に文字サイズを 1 段階大きくし、可読性を改善する。

---

## User Scenarios & Testing

### User Story 1 - タイポグラフィトークンを 1 段階アップスケール (Priority: P1)

`typography.ts` に定義されたフォントサイズトークン（xs / sm / md / lg / xl / xxl）を全て 2px 増加させる。トークンを参照するコンポーネントは自動的に更新される。

**Why this priority**: 中央集権的なトークンを変更するだけで影響範囲が最大になり、最小工数で最大効果が得られる。

**Independent Test**: `typography.ts` の値を変更し、Button・EmptyState・NumericInput が正しいフォントサイズを表示することを確認できる。

**Acceptance Scenarios**:

1. **Given** typography.ts の xs が 12 である、**When** トークンを更新する、**Then** xs が 14 になる
2. **Given** Button コンポーネントが `fontSize.md` を参照している、**When** md が 16 → 18 になる、**Then** ボタンのテキストが 18px で描画される
3. **Given** トークン値変更後、**When** TypeScript のコンパイルを行う、**Then** 型エラーがゼロである

---

### User Story 2 - ハードコード済みフォントサイズを 2px 増加 (Priority: P2)

トークンを参照していない直接数値（`fontSize: 11`, `fontSize: 14` 等）を一律 2px 増加させ、全画面で統一的な文字サイズアップを実現する。

**Why this priority**: P1 でトークン更新をしてもハードコード箇所は影響を受けないため、P1 の後に実施する必要がある。

**Independent Test**: RecordScreen、HomeScreen など主要画面を視覚的に確認し、小さい文字が残っていないことを確認できる。

**Acceptance Scenarios**:

1. **Given** RecentWorkoutCard が `fontSize: 11` をハードコードしている、**When** P2 を適用する、**Then** `fontSize: 13` に変更される
2. **Given** TimerBar が `fontSize: 14` をハードコードしている、**When** P2 を適用する、**Then** `fontSize: 16` に変更される
3. **Given** 全ファイルに変更を適用後、**When** TypeScript チェックを実行する、**Then** エラーがゼロである

---

### Edge Cases

- `text-[Npx]` 形式の NativeWind ハードコードクラス（例: `text-[11px]`）も +2px する
- タイマーの数字（大きめのサイズ）は可読性に直結するため必ず対応する
- ダッシュボード大数字（28px, 32px）は相対的に大きいため +2px でも問題ない

---

## Requirements

### Functional Requirements

- **FR-001**: `typography.ts` の xs/sm/md/lg/xl/xxl を各 +2px する
- **FR-002**: トークン非参照のハードコード fontSize 値を全て +2px する
- **FR-003**: `text-[Npx]` 形式の NativeWind クラスも +2px する
- **FR-004**: 変更後、TypeScript コンパイルエラーがゼロであること
- **FR-005**: 既存テストが全てパスすること（レイアウト変更のためスナップショットテストは除外）

### 変更前後のトークンマッピング

| キー | 変更前 | 変更後 | 用途 |
|------|--------|--------|------|
| xs   | 12     | 14     | キャプション・補足テキスト |
| sm   | 14     | 16     | ラベル・セカンダリテキスト |
| md   | 16     | 18     | 本文テキスト |
| lg   | 18     | 20     | サブタイトル |
| xl   | 20     | 22     | セクションタイトル |
| xxl  | 24     | 26     | 画面タイトル |

### ハードコード値マッピング

| 変更前 | 変更後 | 主な使用箇所 |
|--------|--------|-------------|
| 10     | 12     | TimerBar（再生ボタン記号） |
| 11     | 13     | SetRow, DaySummary, ExercisePickerScreen |
| 12     | 14     | HomeScreen, RecentWorkoutCard, ExerciseBlock |
| 13     | 15     | RecentWorkoutCard, TimerBar, WeeklyGoalsWidget |
| 14     | 16     | RecordScreen, TimerBar, DaySummary |
| 15     | 17     | RecentWorkoutCard, DaySummary |
| 16     | 18     | ExerciseBlock, TimerBar, WeeklyGoalsWidget |
| 18     | 20     | RecentWorkoutCard（絵文字） |
| 20     | 22     | HomeScreen（ページタイトル） |
| 24     | 26     | WeeklyGoalsWidget |
| 28     | 30     | QuickStatsWidget |
| 32     | 34     | StreakCard |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: typography.ts の全トークン値が変更前より 2px 大きい
- **SC-002**: ハードコード値を持つ全コンポーネントで fontSize が 2px 増加している
- **SC-003**: `pnpm --filter mobile tsc --noEmit` がエラー 0 で完了する
- **SC-004**: `pnpm --filter mobile test` が全テストパスで完了する
- **SC-005**: `pnpm lint` が警告・エラーなしで完了する
