# タスクリスト: カレンダー月切替 横スライドアニメーション (#164)

## 並列実行可否

- T1 → T2 → T3（順次）
- T1 と T2 は依存なし（並列可）

---

## T1: テストを更新する（RED フェーズ）

**対象**: `MonthCalendar.component.test.tsx`

### T1-1: ScrollView モックを追加
- `react-native` の `ScrollView` を jest でモック
- `capturedScrollViewRef` で scrollTo 呼び出しを検証できるようにする

### T1-2: カスタムヘッダーのテストを追加
- `←` ボタンをタップすると前月に移動することを確認 (`#164-B1`)
- `→` ボタンをタップすると翌月に移動することを確認 (`#164-B2`)
- 当月表示中に `→` ボタンが disabled であることを確認 (`#164-C1`)

### T1-3: スワイプ月変更のテストを追加
- `onMomentumScrollEnd` で前月へ移動することをシミュレート
- `onMomentumScrollEnd` で翌月へ移動することをシミュレート
- 当月から翌月方向スワイプがブロックされることを確認 (`#164-C2`)

### T1-4: 既存テストを新アーキテクチャに合わせて更新
- `enableSwipeMonths={true}` テスト → `enableSwipeMonths` は使わなくなるため削除 or `false` に変更
- 各 Calendar パネルに正しい month が渡されるか確認

---

## T2: MonthCalendar.tsx を実装する（GREEN フェーズ）

**対象**: `MonthCalendar.tsx`

### T2-1: import を更新
- `addMonths`, `subMonths`, `isSameMonth`, `isAfter`, `startOfMonth` を date-fns から追加
- `ScrollView`, `TouchableOpacity`, `Pressable` を react-native から追加
- `useRef` を react から追加

### T2-2: state/ref を追加
- `displayMonth: Date` state（`startOfMonth(new Date())` で初期化）
- `containerWidth: number` state（`onLayout` で更新）
- `isAnimating: boolean` state（多重発火防止）
- `scrollViewRef: RefObject<ScrollView>`

### T2-3: 派生値
- `months` (useMemo): `[subMonths(displayMonth, 1), displayMonth, addMonths(displayMonth, 1)]`
- `today`: `startOfMonth(new Date())`
- `isNextMonthDisabled`: 当月以降への移動を禁止

### T2-4: ハンドラ実装
- `handleMomentumScrollEnd`: index を計算して `navigateMonth(direction)` を呼ぶ
- `navigateMonth(direction: 'prev' | 'next')`: isAnimating チェック、月更新、ScrollView リセット
- `handlePrevMonth` / `handleNextMonth`: 矢印ボタン用
- `handleLayout`: `containerWidth` を更新

### T2-5: renderHeader（カスタムヘッダー）
- `←` ボタン（`Pressable` / `TouchableOpacity`）
- 月名表示（`displayMonth` の年月表示）
- `→` ボタン（`isNextMonthDisabled` のとき `disabled`）

### T2-6: JSX を組み立てる
- `View` (onLayout) → `CustomHeader` → `ScrollView` (horizontal, pagingEnabled)
- ScrollView 内: 3 つの `View` (width=containerWidth) × Calendar
- 各 Calendar: `hideArrows={true}`, `renderHeader={() => null}`, `enableSwipeMonths={false}`

---

## T3: テストを通す（GREEN → REFACTOR）

- `pnpm --filter mobile test MonthCalendar` を実行して全テスト PASS を確認
- `pnpm --filter mobile tsc --noEmit` で型チェック
- `pnpm lint` で Lint チェック

---

## 完了チェックリスト

### ユーザーストーリー
- [ ] #164-S1: 右スワイプで前月スライドイン
- [ ] #164-S2: 左スワイプで翌月スライドイン
- [ ] #164-S3: スワイプ中は指の動きに追従（pagingEnabled）
- [ ] #164-B1: ← ボタンで前月スライドイン
- [ ] #164-B2: → ボタンで翌月スライドイン
- [ ] #164-C1: 当月から → ボタン押下不可
- [ ] #164-C2: 当月から左スワイプしても翌月に移動しない
- [ ] #164-D1: 日付タップで onDayPress が呼ばれる

### テスト
- [ ] 全テスト PASS
- [ ] 型チェック PASS
- [ ] Lint PASS
