# タスク一覧: カレンダーフリックで前後月ナビゲーション

- **Feature ID**: 20260223-calendar-swipe-navigation
- **GitHub Issue**: #129
- **作成日**: 2026-02-23

---

## サマリー

| 項目 | 数 |
|------|---|
| 総タスク数 | 5 |
| 並列実行可能 | T1 のみ独立 (T2 は T1 完了後) |

---

## タスク一覧

### T1: MonthCalendar フリックテストを追加（Red）

- **ファイル**: `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.component.test.tsx`
- **並列可否**: 独立（T2 の前に実行）
- **依存**: なし

**追加テストケース:**

```
describe('MonthCalendar - フリックジェスチャー')
  ✗ 左フリック（dx=-100）で onMonthChange が翌月の日付で呼ばれる
  ✗ 右フリック（dx=100）で onMonthChange が前月の日付で呼ばれる
  ✗ 小さい横移動（dx=30）ではフリックが発動しない
  ✗ 縦スクロール（|dx|<|dy|）ではフリックが発動しない
  ✗ 当月（2026-02）で左フリックしても翌月（2026-03）には移動しない
```

PanResponder モック方針:
- `jest.spyOn(PanResponder, 'create')` で `onPanResponderRelease` を捕捉
- または `react-native` の `PanResponder` をモックして `handlers` を取得し、直接呼び出す

---

### T2: MonthCalendar にフリックジェスチャーを実装（Green）

- **ファイル**: `apps/mobile/src/features/calendar/components/MonthCalendar.tsx`
- **並列可否**: T1 完了後に実行
- **依存**: T1

**実装内容:**

1. `import { addMonths, subMonths, startOfMonth, isAfter, parseISO } from 'date-fns'` を追加
2. `import { PanResponder, useRef } from 'react'` の `useRef` を既存 import に追加
3. `displayMonth` state を追加: `const [displayMonth, setDisplayMonth] = useState(format(new Date(), 'yyyy-MM-dd'))`
4. `goToPrevMonth` / `goToNextMonth` 関数を実装（未来月不可チェック含む）
5. `PanResponder` を `useRef` で作成:
   - `onMoveShouldSetPanResponder`: `|dx| > |dy| && |dx| > 10`
   - `onPanResponderRelease`: `dx < -50` → goToNextMonth, `dx > 50` → goToPrevMonth
6. `Calendar` に `current={displayMonth}` を追加
7. `onMonthChange` に `displayMonth` 更新ロジックを追加（矢印ボタン押下時の同期）
8. `Calendar` の外側を `<View {...panResponder.panHandlers}>` でラップ

---

### T3: テストを Green に通す（Verify）

- **コマンド**: `pnpm --filter mobile test -- --testPathPattern="MonthCalendar" --verbose`
- **並列可否**: T2 完了後
- **依存**: T2

- T1 で書いた Red テストが全て PASS することを確認
- 既存テスト（日付タップ、未来日無効）が引き続き PASS することを確認

---

### T4: 型チェックと Lint（Quality Gate）

- **コマンド**:
  - `pnpm --filter mobile tsc --noEmit`
  - `pnpm lint`
- **並列可否**: T3 完了後
- **依存**: T3

---

### T5: 全テストスイートを実行して回帰確認

- **コマンド**: `pnpm --filter mobile test --coverage`
- **並列可否**: T4 完了後
- **依存**: T4

- カバレッジ目標: 90%以上（既存水準を維持）
- CalendarScreen のテストが引き続き PASS することを確認

---

## 実行順序

```
T1 (Red テスト追加)
  ↓
T2 (実装)
  ↓
T3 (テスト確認)
  ↓
T4 (型チェック・Lint)
  ↓
T5 (全テスト・カバレッジ)
```
