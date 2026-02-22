# Tasks: ワイヤーフレーム完全準拠 UI 修正

**Input**: `specs/003-wireframe-ui-fix/`
**ワイヤーフレーム正典**: `requirements/adopted/workout_plus_wireframes_v5_md3.html`
**実装原則**: WF の CSS/HTML を **1 プロパティずつ完全再現**する。設計の独自判断・補完を一切行わない。各タスクに WF の行範囲を明記する。

---

## Phase 1: Setup（共有インフラ）

**目的**: 全フェーズで使用するカラー定数を追加する

- [x] T001 `apps/mobile/src/shared/constants/colors.ts` に `streakDayRest: 'rgba(77, 148, 255, 0.10)'` を追加する
  - **WF 根拠**: L476-478 `.streak-day-circle.rest { background: rgba(77, 148, 255, 0.10) }`
  - 既存の `primaryBgSubtle`（0.08）とは別の値。`colors.ts` の末尾に追加

---

## Phase 2: Foundation（ブロッキング前提条件）— US5

**目的**: 2026/2/1 のシードデータを DB に投入し、全 UI を実データで確認可能にする

**⚠️ CRITICAL**: このフェーズが完了するまで US1/US2/US3 の UI 確認はできない

### テスト（TDD: 先に RED を確認）

- [x] T002 [US5] `apps/mobile/src/database/__tests__/seed.test.ts` に `generateDevWorkoutSeedSQL` のテストを追加する（FAIL 確認後に T003 へ）
  - 検証内容: 完了済み workouts が 0 件の場合、関数が正常終了して DB にワークアウトが 1 件存在すること
  - 検証内容: 完了済み workouts が 1 件以上の場合、シードを実行しないこと（冪等性）

### 実装

- [x] T003 [US5] `apps/mobile/src/database/seed.ts` に `generateDevWorkoutSeedSQL(db: SQLiteDatabase): Promise<void>` を追加する
  - 内部処理:
    1. `SELECT id FROM exercises WHERE name = 'ベンチプレス' LIMIT 1` で exercise ID を取得
    2. `SELECT id FROM exercises WHERE name = 'インクラインベンチプレス' LIMIT 1` で exercise ID を取得
    3. workouts: `INSERT OR IGNORE INTO workouts (id, status, created_at, completed_at, elapsed_seconds) VALUES (ulid(), 'completed', 1738332000000, 1738339200000, 7200)`
    4. workout_exercises: 2件 INSERT OR IGNORE（ベンチプレス order_index=0、インクラインチェストプレス order_index=1）
    5. sets: 6件 INSERT OR IGNORE
       - ベンチプレス: 60kg×10 / 65kg×8 / 70kg×5
       - インクラインベンチプレス: 50kg×10 / 55kg×8 / 55kg×6
  - **WF 根拠**: L3142-3147（ベンチプレス）、L3228-3234（インクラインプレス）

- [x] T004 [US5] `apps/mobile/src/database/migrations.ts` に migration v2 を追加する
  - `LATEST_VERSION = 2` に変更
  - `migrateV1ToV2(db: SQLiteDatabase): Promise<void>` を追加
  - 処理: `SELECT COUNT(*) FROM workouts WHERE status = 'completed'` → count === 0 の場合のみ `generateDevWorkoutSeedSQL(db)` を呼び出す
  - `migrateDatabase` 関数の switch に `case 1: await migrateV1ToV2(db)` を追加

**Checkpoint**: アプリを再起動後、DB に 2026/2/1 のワークアウトが 1 件存在する

---

## Phase 3: User Story 1 — タブバーの+ボタン修正 (P1) 🎯

**Goal**: タブバー中央の+ボタンが上に浮き出た状態で完全に表示され、青いシャドウがかかる

**Independent Test**: アプリ起動後、タブバーを目視確認するだけで検証可能（データ不要）

**WF 参照範囲**: `wireframes_v5_md3.html` L281-357

### テスト（TDD: 先に RED を確認）

- [x] T005 [P] [US1] `apps/mobile/src/app/__tests__/MainTabs.test.tsx` を作成する（FAIL 確認後に T006 へ）
  - 検証内容: `testID="record-tab-button"` の要素が存在すること
  - 検証内容: RecordTabButton のスタイルに `shadowColor` が設定されていること
  - **WF 根拠**: L343-357 `.add-button` の仕様

### 実装

- [x] T006 [US1] `apps/mobile/src/app/MainTabs.tsx` の `tabBarStyle` に `overflow: 'visible'` を追加する
  - **WF 根拠**: L338-341 `.tab-bar-item.center { position: relative; margin-top: -24px; }` ← 中央ボタンがタブバー上部にはみ出るため、`overflow` を切らない必要がある

- [x] T007 [US1] `apps/mobile/src/app/MainTabs.tsx` の `RecordTabButton` に以下を 1 プロパティずつ追加する
  - `width: 56` ← WF L344: `width: 56px`
  - `height: 56` ← WF L345: `height: 56px`
  - `borderRadius: 28` ← WF L346: `border-radius: 50%`（半径 = 28px）
  - `backgroundColor: colors.primary` ← WF L347: `background: var(--md-sys-color-primary)`
  - `shadowColor: colors.primary` ← WF L353: `box-shadow: 0 4px 16px rgba(77,148,255,0.4)` の色成分
  - `shadowOffset: { width: 0, height: 4 }` ← WF L353: `0 4px` の x/y オフセット
  - `shadowRadius: 16` ← WF L353: `16px` のぼかし半径（React Native はそのまま使用）
  - `shadowOpacity: 0.4` ← WF L353: `rgba(77,148,255,**0.4**)` の透明度
  - `elevation: 8` ← Android 対応（shadowColor は iOS のみ有効）
  - `borderWidth: 4` ← WF L354: `border: 4px solid var(--md-sys-color-background)`
  - `borderColor: colors.background` ← WF L354: `var(--md-sys-color-background)` = `colors.background`

**Checkpoint**: +ボタンがタブバーから上に浮き出し、青いシャドウが確認できる

---

## Phase 4: User Story 2 — ホーム画面レイアウト修正 (P1) 🎯

**Goal**: データ 0 件でも StreakCard が表示され、データある場合は WeeklyGoals + RecentWorkoutCard も表示される

**Independent Test**: Phase 2 完了後、ホーム画面を開いて確認

**WF 参照範囲**: `wireframes_v5_md3.html` L400-485（StreakCard CSS）、L490-730（HomeMain CSS）、L2903-3076（ホーム画面 HTML）

---

### Phase 4-A: HomeScreen EmptyState 廃止

#### テスト（TDD: 先に RED を確認）

- [x] T008 [P] [US2] `apps/mobile/src/features/home/screens/__tests__/HomeScreen.test.tsx` を更新する（FAIL 確認後に T009 へ）
  - 検証内容: workouts = 0 件のとき `StreakCard` コンポーネントが render されること
  - 検証内容: workouts = 0 件のとき 💪 絵文字を含むテキストが render されないこと
  - **WF 根拠**: L2903-2910（ホーム画面は常に streak-card を含むヘッダーを持つ。EmptyState なし）

#### 実装

- [x] T009 [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` の EmptyState 分岐を削除する
  - `if (workoutSummaries.length === 0) return (...)` ブロック全体を削除する（L211-251）
  - 💪 絵文字・「まだワークアウトがありません」・「+ボタンで最初の〜」テキストをすべて削除する
  - `loading` ブランチの後は単一の `return (...)` のみにする
  - **WF 根拠**: L2903-2125（ワイヤーフレームに EmptyState は存在しない。常に同一レイアウト）

---

### Phase 4-B: StreakCard 修正（曜日ラベル + チェックマーク + rest 色）

#### テスト（TDD: 先に RED を確認）

- [x] T010 [P] [US2] `apps/mobile/src/features/home/components/__tests__/StreakCard.test.ts` を更新する（FAIL 確認後に T011-T013 へ）
  - 検証内容: rest 状態の円の背景が `rgba(77, 148, 255, 0.10)` であること
    - **WF 根拠**: L476-478 `.streak-day-circle.rest { background: rgba(77,148,255,0.10) }`
  - 検証内容: done 状態の円の内側に SVG checkmark（`<polyline points="20 6 9 17 4 12">`）が存在すること
    - **WF 根拠**: L470-474 `.streak-day-circle.done svg`、L2920 HTML 実装
  - 検証内容: 曜日ラベル（「月」「火」「水」「木」「金」「土」「日」）が 7 件存在すること
    - **WF 根拠**: L480-485 `.streak-day-label`、L2921/2925/2929/2933/2937/2941/2945 HTML 実装

#### 実装

- [x] T011 [US2] `apps/mobile/src/features/home/components/streakCardStyles.ts` の rest 状態の背景色を修正する
  - `rest` ブランチの `backgroundColor` を `colors.streakDayRest`（= `rgba(77, 148, 255, 0.10)`）に変更する
  - **WF 根拠**: L476-478 `.streak-day-circle.rest { background: rgba(77, 148, 255, 0.10) }`（現状は `colors.border` = `#e2e8f0` で誤り）

- [x] T012 [US2] `apps/mobile/src/features/home/components/StreakCard.tsx` の各インジケーター下に曜日ラベルを追加する
  - 7 日分の各 `<View>` に `<Text>` で「月」「火」「水」「木」「金」「土」「日」を追加する
  - スタイル:
    - `fontSize: 10` ← WF L481: `font-size: 10px`
    - `fontWeight: '400'` ← WF L482: `font-weight: 400`
    - `color: colors.primary` ← WF L483: `color: var(--md-sys-color-primary)`
    - `opacity: 0.7` ← WF L484: `opacity: 0.7`
  - **WF 根拠**: L480-485 `.streak-day-label`、HTML L2921/2925/2929/2933/2937/2941/2945

- [x] T013 [US2] `apps/mobile/src/features/home/components/StreakCard.tsx` の done 状態の円に白チェックマーク SVG を追加する
  - done 円の `<View>` 内に `<Svg>` コンポーネントを追加する
  - SVG: `<Polyline points="20 6 9 17 4 12" stroke="white" strokeWidth={3} fill="none" />`
  - SVG サイズ:
    - `width: 14` ← WF L471: `width: 14px`
    - `height: 14` ← WF L472: `height: 14px`
    - `color: '#fff'` ← WF L473: `color: #fff`
  - **WF 根拠**: L466-474 `.streak-day-circle.done`、HTML L2920/2924/2932/2936/2944

---

### Phase 4-C: WeeklyGoalsWidget 新規作成

#### テスト（TDD: 先に RED を確認）

- [x] T014 [P] [US2] `apps/mobile/src/features/home/components/__tests__/WeeklyGoalsWidget.test.tsx` を新規作成する（FAIL 確認後に T015 へ）
  - 検証内容: `testID="goals-grid"` の要素が存在すること
  - 検証内容: `testID="progress-bar"` の要素が存在すること
  - 検証内容: `thisWeekWorkouts=3, targetWorkouts=3` で達成率 100% が表示されること
  - 検証内容: `thisWeekWorkouts=0` でプログレスバーの幅が 0 であること
  - **WF 根拠**: L2954-2988 HTML 構造

#### 実装

- [x] T015 [P] [US2] `apps/mobile/src/features/home/components/WeeklyGoalsWidget.tsx` を新規作成する
  - **コンポーネント全体のスタイル（WF L530-536 `.weekly-goals`）**:
    - `backgroundColor: colors.white` ← `background: var(--md-sys-color-surface)`
    - `borderRadius: 12` ← `border-radius: var(--md-sys-shape-medium)`（= 12px）
    - `padding: 20` ← `padding: 20px`
    - `marginBottom: 24` ← `margin-bottom: 24px`
    - `borderWidth: 1` ← `border: 1px solid`
    - `borderColor: colors.border` ← `var(--md-sys-color-outline-variant)`
  - **ヘッダー（WF L538-549 `.goals-header` / `.goals-title`）**:
    - flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16
    - タイトルテキスト「今週の目標」: `fontSize: 16, fontWeight: '600', color: colors.textPrimary`
    - 「順調」バッジ（WF L551-565 `.status-badge.on-track`）: `backgroundColor: colors.primaryBg, color: colors.primary, padding: [4, 12], borderRadius: 4, fontSize: 12, fontWeight: '600'`
  - **3 カラムグリッド（WF L579-607 `.goals-grid` / `.goal-item` / `.goal-value` 等）**:
    - flexDirection: 'row', gap: 12, marginBottom: 16
    - 各セル: `flex: 1, alignItems: 'center'`
    - 値テキスト: `fontSize: 24, fontWeight: '700'` ← WF L589-592
    - ラベルテキスト: `fontSize: 12, color: colors.textSecondary, fontWeight: '400'` ← WF L595-599
    - 変化テキスト（↑↓）: `fontSize: 12, fontWeight: '600', marginTop: 2` ← WF L601-607、緑の場合 `color: colors.success`
    - セル 1: `thisWeekWorkouts` 値 + 「ワークアウト」ラベル + 前週比
    - セル 2: `(thisWeekVolume / 1000).toFixed(1) + 't'` + 「総負荷量」ラベル
    - セル 3: `achievementRate + '%'` + 「達成率」ラベル（`Math.min(Math.round((thisWeekWorkouts / targetWorkouts) * 100), 100)`）
  - **プログレスバー（WF L609-641）**:
    - ヘッダー行: `justifyContent: 'space-between'`, ラベル「週間目標進捗」（fontSize:13, color: textSecondary）、パーセンテージ（fontSize:13, fontWeight:'700', color: primary）
    - バー外枠（WF L630-635 `.progress-bar`）: `height: 8, backgroundColor: colors.neutralBg, borderRadius: 4, overflow: 'hidden'`
    - バー塗り（WF L637-641 `.progress-fill`）: `height: '100%', backgroundColor: colors.primary, borderRadius: 4, width: achievementRate + '%'`
  - **WF 根拠**: L530-641（CSS）、L2954-2988（HTML）

- [x] T016 [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` に WeeklyGoalsWidget を統合する
  - `WeeklyGoalsWidget` を import する
  - 前週ワークアウト数を `trainingDates` + `date-fns/subWeeks` で集計し、`lastWeekWorkouts` として算出する
  - `today週のワークアウト量` を `workoutSummaries` から週内のものを合算して `thisWeekVolume` とする
  - `workoutSummaries.length > 0` の場合に `<WeeklyGoalsWidget>` を ScrollView 先頭に追加する
  - **WF 根拠**: L2954-2988（「今週の目標」セクションはホーム main 最上部）

---

### Phase 4-D: RecentWorkoutCard 改善（種目アイコン + 完了バッジ）

#### テスト（TDD: 先に RED を確認）

- [x] T017 [P] [US2] `apps/mobile/src/features/home/components/__tests__/RecentWorkoutCard.test.tsx` を更新する（FAIL 確認後に T018-T020 へ）
  - 検証内容: `testID="task-icon"` の要素が存在すること
  - 検証内容: `testID="status-badge"` のテキストが「完了」であること
  - 検証内容: `primaryMuscleGroup="chest"` のとき `testID="task-icon"` の背景色が `colors.primaryBg` であること
  - **WF 根拠**: L662-675（`.task-icon` CSS）、L2997-3013（HTML）

#### 実装

- [x] T018 [US2] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` にカードコンテナスタイルを WF に合わせる
  - `.task-card` スタイルを 1 プロパティずつ適用する（WF L646-653）:
    - `backgroundColor: colors.white` ← `background: var(--md-sys-color-surface)`
    - `borderRadius: 12` ← `border-radius: var(--md-sys-shape-medium)`
    - `padding: 16` ← `padding: 16px`
    - `marginBottom: 12` ← `margin-bottom: 12px`
    - `borderWidth: 1` ← `border: 1px solid`
    - `borderColor: colors.border` ← `var(--md-sys-color-outline-variant)`

- [x] T019 [US2] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` に `.task-header` 構造を追加する
  - task-header 行（WF L655-660）: `flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12`
  - **task-icon** 追加（WF L662-675）:
    - `width: 40, height: 40` ← `width: 40px; height: 40px`
    - `borderRadius: 12` ← `border-radius: var(--md-sys-shape-medium)`
    - `alignItems: 'center', justifyContent: 'center', flexShrink: 0`
    - 部位別背景色（WF L673-675）:
      - `chest`: `colors.primaryBg` (#E6F2FF) ← `.task-icon.chest { background: var(--md-sys-color-primary-container) }`
      - `back`: `colors.primaryBgMedium` (#E0ECFF) ← `.task-icon.back { background: #E0ECFF }`
      - `legs`: `colors.primaryBgStrong` (#D6E8FF) ← `.task-icon.legs { background: #D6E8FF }`
      - その他（mixed/unknown）: `colors.neutralBg` (#F1F3F5)
  - **task-info** 追加（WF L677-692）:
    - `flex: 1`
    - タイトルテキスト（ワークアウト名または日付）: `fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 4` ← WF L679-684
    - 日時テキスト: `fontSize: 13, color: colors.textSecondary` ← WF L686-692
  - **「完了」バッジ** 追加（WF L551-560 / L567-570）:
    - `testID="status-badge"`
    - `backgroundColor: '#cce5ff'` ← WF L568: `.status-badge.completed { background: #cce5ff }`
    - `color: colors.primary` ← WF L569: `color: var(--md-ref-palette-primary40)`
    - `paddingVertical: 4, paddingHorizontal: 12` ← WF L555: `padding: 4px 12px`
    - `borderRadius: 4` ← WF L556: `border-radius: var(--md-sys-shape-small)`
    - `fontSize: 12, fontWeight: '600'` ← WF L558-559
    - テキスト: 「完了」← WF HTML L3006

- [x] T020 [US2] `apps/mobile/src/features/home/components/RecentWorkoutCard.tsx` に `.task-tags` 行を WF に合わせる
  - タグ行（WF L694-699）: `flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8`
  - sets タグ（WF L709）: `backgroundColor: colors.tagYellowBg, color: colors.tagYellowText`
  - volume タグ（WF L710）: `backgroundColor: colors.tagBlueBg, color: colors.tagBlueText`
  - time タグ（WF L711）: `backgroundColor: colors.tagPurpleBg, color: colors.tagPurpleText`
  - タグ共通（WF L701-707）: `padding: [4, 8], borderRadius: 4, fontSize: 11, fontWeight: '600'`
  - **WF 根拠**: L694-711（CSS）、L3009-3013（HTML）

- [x] T021 [US2] `apps/mobile/src/features/home/screens/HomeScreen.tsx` の `WorkoutSummary` 型と `fetchData` を更新する
  - `WorkoutSummary` 型に `primaryMuscleGroup?: string` を追加する
  - `fetchData` 内で `exercises[0]` の `muscle_group` を取得し `primaryMuscleGroup` に設定する
  - `RecentWorkoutCard` の呼び出しに `primaryMuscleGroup` を渡す
  - **WF 根拠**: L673-675（部位別アイコン色は muscle_group で切り替え）

**Checkpoint**: ホーム画面に StreakCard（曜日ラベル+チェックマーク）、WeeklyGoals、種目アイコン付きワークアウトカードが表示される

---

## Phase 5: User Story 3 — カレンダー訓練日スタイル (P2)

**Goal**: トレーニング実施日のセルに薄青背景が表示され、今日は青塗りつぶしになる

**Independent Test**: Phase 2 完了後、カレンダー 2 月を確認して 2/1 セルに薄青背景が表示されること

**WF 参照範囲**: `wireframes_v5_md3.html` L1936-1993（カレンダー CSS）、L3817-3877（カレンダー HTML）

### テスト（TDD: 先に RED を確認）

- [x] T022 [P] [US3] `apps/mobile/src/features/calendar/components/__tests__/MonthCalendar.test.tsx` を作成する（FAIL 確認後に T023 へ）
  - 検証内容: 訓練日のマーキングに `customStyles.container.backgroundColor === colors.primaryBg` が設定されること
  - 検証内容: 今日のマーキングに `customStyles.container.backgroundColor === colors.primary` が設定されること
  - **WF 根拠**: L1976-1984（has-training / today スタイル）

### 実装

- [x] T023 [US3] `apps/mobile/src/features/calendar/components/MonthCalendar.tsx` の markingType と markedDates を WF に合わせる
  - `markingType="custom"` に変更する（dotColor は無効になる）
  - **訓練日セル**（WF L1976-1978 `.calendar-day.has-training`）:
    - `customStyles.container.backgroundColor: colors.primaryBg` (#E6F2FF) ← `background: var(--md-sys-color-primary-container)`
    - `customStyles.container.borderRadius: 6` ← WF L1965: `border-radius: var(--md-sys-shape-small)`（= 6px）
    - `customStyles.text.color: colors.textPrimary` ← WF L1968: `color: var(--md-sys-color-on-surface)`
  - **今日のセル**（WF L1980-1984 `.calendar-day.today`）:
    - `customStyles.container.backgroundColor: colors.primary` (#4D94FF) ← `background: var(--md-sys-color-primary)`
    - `customStyles.text.color: colors.white` ← `color: #ffffff`
    - `customStyles.text.fontWeight: '600'` ← WF L1983: `font-weight: 600`
  - **通常セル**（WF L1958-1970 `.calendar-day`）:
    - `customStyles.container.backgroundColor: colors.white` ← `background: var(--md-sys-color-surface)`
    - `customStyles.text.color: colors.textPrimary`
  - **WF 根拠**: L1958-1984（CSS）、L3840-3877（HTML: `has-training` / `today` クラスの実際の使用）

**Checkpoint**: カレンダーで 2/1（シードデータ）のセルに薄青背景、今日のセルに青塗りつぶしが表示される

---

## Phase 6: User Story 4 — 記録画面の種目ブロック器具表示 (P2)

**Goal**: 種目名の下に「筋肉グループ名 · 器具名」がグレーテキストで表示される

**Independent Test**: 記録画面で種目を 1 件追加して確認（Phase 2 不要）

**WF 参照範囲**: `wireframes_v5_md3.html` L892-916（exercise CSS）、L3142-3148（ベンチプレス HTML）、L3228-3234（インクラインプレス HTML）

### テスト（TDD: 先に RED を確認）

- [x] T024 [P] [US4] `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx` を更新する（FAIL 確認後に T025 へ）
  - 検証内容: `exercise.equipment = 'barbell'` のとき「バーベル」テキストが存在すること
  - 検証内容: `.exercise-meta` 相当の要素に「胸 · バーベル」形式のテキストが表示されること
  - **WF 根拠**: L911-916（`.exercise-meta` CSS）、L3146（`胸 • コンパウンド` HTML）
  - *注: WF の `コンパウンド` は器具ではなく種別。実装では exercise.equipment の日本語名を表示する*

### 実装

- [x] T025 [US4] `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` に器具ラベルを追加する
  - ファイル内に `EQUIPMENT_LABELS` 定数を追加する:
    ```
    barbell: 'バーベル', dumbbell: 'ダンベル', machine: 'マシン',
    cable: 'ケーブル', bodyweight: '自重', other: 'その他'
    ```
  - 既存の `muscleLabel` テキストの後に ` · ` + `EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment` を追加する
  - **`.exercise-meta` スタイル確認（WF L911-916）**:
    - `fontSize: 12` ← `font-size: 12px`（現状 `text-[12px]` で OK）
    - `color: colors.textSecondary` ← `color: var(--md-sys-color-on-surface-variant)`（現状 `text-[#64748b]` で OK）
    - `fontWeight: '400'` ← `font-weight: 400`（現状 OK）
    - `marginTop: 2` ← `margin-top: 2px`（現状 `mt-[2px]` で OK）
  - **WF 根拠**: L911-916（`.exercise-meta` CSS）、L3146（`胸 &#8226; コンパウンド` HTML の `•` 区切り記号と並び順）

**Checkpoint**: 記録画面の種目ブロックに「胸 · バーベル」形式のメタテキストが表示される

---

## Phase N: 仕上げ & 横断的関心事

- [x] T026 [P] `pnpm --filter mobile tsc --noEmit` で型エラーが 0 件であることを確認する
- [x] T027 [P] `pnpm lint` で Lint エラーが 0 件であることを確認する
- [x] T028 `pnpm --filter mobile test --coverage` でカバレッジ 90%+ を確認する（jest.config の collectCoverageFrom に `!src/**/__tests__/**` 除外を追加して修正）

---

## 依存関係グラフ

### フェーズ依存関係

```
Phase 1 (Setup/T001)      ←── 依存なし。即座に開始可能
Phase 2 (Foundation/T002-T004)  ←── Phase 1 完了後
Phase 3 (US1/T005-T007)   ←── Phase 1 完了後。Phase 2 と並列実行可能
Phase 4 (US2/T008-T021)   ←── Phase 1, 2 完了後（シードデータで UI を確認するため）
Phase 5 (US3/T022-T023)   ←── Phase 1, 2 完了後（シードデータで訓練日セルを確認するため）
Phase 6 (US4/T024-T025)   ←── Phase 1 完了後（記録画面は独立確認可能）
Phase N  (T026-T028)       ←── 全フェーズ完了後
```

### ユーザーストーリー依存関係

| US | 依存 | 独立テスト |
|----|------|-----------|
| US1（+ボタン）| Phase 1 のみ | アプリ起動後、目視確認 |
| US2（ホーム）| Phase 1, 2 | シードデータ後、ホーム画面確認 |
| US3（カレンダー）| Phase 1, 2 | シードデータ後、カレンダー 2 月確認 |
| US4（記録画面）| Phase 1 のみ | 記録画面で種目を 1 件追加して確認 |
| US5（シードデータ）| Phase 1 のみ | DB 直接確認またはホーム画面表示 |

### Phase 4 内の並列実行（5 エージェント構成）

```
Agent 1: T001 → T002 → T003 → T004（Setup + Foundation）
Agent 2: T005 → T006 → T007（US1: +ボタン）
Agent 3: T008 → T009 → T010 → T011 → T012 → T013（US2: HomeScreen + StreakCard）
Agent 4: T014 → T015 → T016（US2: WeeklyGoalsWidget）
Agent 5: T017-T021 → T022-T023 → T024-T025（US2: Cards + US3 + US4）
```

---

## 実装戦略

### MVP ファースト（US5 + US1 のみ）

1. Phase 1: T001（Setup）
2. Phase 2: T002-T004（シードデータ → 全 UI 確認可能に）
3. Phase 3: T005-T007（+ボタン → コア機能エントリーポイント確認）
4. **STOP & VALIDATE**: +ボタンが正しく表示・動作することを目視確認

### インクリメンタルデリバリー

1. Phase 1-2 完了 → シードデータ投入確認
2. Phase 3 完了 → +ボタン修正確認
3. Phase 4 完了 → ホーム画面 3 セクション確認
4. Phase 5-6 完了 → カレンダー・記録画面確認
5. Phase N 完了 → 品質チェック通過

---

## WF CSS → RN スタイル変換早見表

| CSS 変数 | colors.ts 定数 | 値 |
|---------|--------------|-----|
| `var(--md-sys-color-primary)` | `colors.primary` | `#4D94FF` |
| `var(--md-sys-color-primary-container)` | `colors.primaryBg` | `#E6F2FF` |
| `var(--md-sys-color-surface)` | `colors.white` | `#FFFFFF` |
| `var(--md-sys-color-background)` | `colors.background` | `#f9fafb` |
| `var(--md-sys-color-on-surface)` | `colors.textPrimary` | `#475569` |
| `var(--md-sys-color-on-surface-variant)` | `colors.textSecondary` | `#64748b` |
| `var(--md-sys-color-outline-variant)` | `colors.border` | `#e2e8f0` |
| `var(--md-sys-color-surface-container-high)` | `colors.neutralBg` | `#F1F3F5` |
| `rgba(77, 148, 255, 0.08)` | `colors.primaryBgSubtle` | StreakCard 背景 |
| `rgba(77, 148, 255, 0.15)` | `colors.primaryBorderSubtle` | StreakCard ボーダー |
| `rgba(77, 148, 255, 0.10)` | `colors.streakDayRest`（T001 で追加）| rest 円 |
| `#E0ECFF` | `colors.primaryBgMedium` | back アイコン |
| `#D6E8FF` | `colors.primaryBgStrong` | legs アイコン |
| `border-radius: small (6px)` | RN: `borderRadius: 6` | — |
| `border-radius: medium (12px)` | RN: `borderRadius: 12` | — |
