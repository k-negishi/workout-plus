# 実装計画: ワイヤーフレーム完全準拠 UI 修正

**Branch**: `003-wireframe-ui-fix` | **Date**: 2026-02-22 | **Spec**: [specs/003-wireframe-ui-fix/spec.md](./spec.md)

---

## Summary

実機（iPhone 16 Pro）で確認した 3 つの根本問題を解消する:

1. **データ 0 件問題** → 2/1 シードデータを migration v2 として追加し、全 UI を実データで確認可能にする
2. **+ボタン消失** → `tabBarStyle` に `overflow: 'visible'` 追加 + `box-shadow` 実装
3. **StreakCard 設計ミス** → ワイヤーフレーム HTML の実際のデザイン（曜日ラベル+チェックマーク+薄青 rest）に修正

加えてホーム画面の WeeklyGoals セクション・RecentWorkoutCard 改善・カレンダー訓練日スタイル・記録画面の器具表示を追加する。ビジュアル層のみ変更。データ構造・ナビゲーション・ビジネスロジックは一切変更しない。

---

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: @react-navigation/bottom-tabs v7, NativeWind v4, react-native-calendars, expo-sqlite ~15.2.0, react-native-svg
**Storage**: SQLite via expo-sqlite（migration pattern で version 管理）
**Testing**: Jest + React Native Testing Library、カバレッジ閾値 90%
**Target Platform**: iOS 16+ / Android 10+（Expo Go）
**Project Type**: Mobile（Expo managed workflow）
**Performance Goals**: N/A（ビジュアル層のみ）
**Constraints**: Expo Go（ネイティブモジュール追加不可）、`^` 禁止・`~` または厳密固定
**Scale/Scope**: 変更対象 8 ファイル + 新規 2 ファイル（WeeklyGoalsWidget + dev-seed）

---

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. ローカルファースト | ✅ PASS | DB 変更なし。シードデータは SQLite にローカル書き込み |
| II. 引き算のデザイン | ✅ PASS | ワイヤーフレーム準拠の修正のみ。装飾追加なし |
| III. MVP スコープ厳守 | ✅ PASS | ビジュアル層 + シードのみ。新機能追加なし |
| IV. マネージドサービス | N/A | モバイル単体変更のみ |
| V. 個人開発持続可能性 | ✅ PASS | 既存構造最大活用。新規ファイル 2 件のみ |
| VI. テスト・品質規律 | ✅ PASS | 変更コンポーネントごとに単体テスト必須 |

**Complexity Tracking**: 違反なし

---

## Project Structure

### Documentation (this feature)

```text
specs/003-wireframe-ui-fix/
├── plan.md              ← 本ファイル
├── research.md          ← Phase 0 出力
├── data-model.md        ← Phase 1 出力
└── tasks.md             ← /speckit.tasks で生成
```

### Source Code（変更・追加対象ファイル）

```text
apps/mobile/src/
├── app/
│   └── MainTabs.tsx                              # overflow: visible + box-shadow
├── database/
│   ├── seed.ts                                   # generateDevWorkoutSeedSQL() 追加
│   └── migrations.ts                             # migration v2 追加
├── features/
│   ├── home/
│   │   ├── screens/HomeScreen.tsx                # EmptyState でも StreakCard 表示 + WeeklyGoals
│   │   └── components/
│   │       ├── StreakCard.tsx                    # 曜日ラベル + チェックマーク + rest 色修正
│   │       ├── streakCardStyles.ts              # rest 色変更
│   │       ├── WeeklyGoalsWidget.tsx            # 新規作成
│   │       └── RecentWorkoutCard.tsx            # 種目アイコン + 完了バッジ + 名前
│   ├── calendar/
│   │   └── components/MonthCalendar.tsx         # markingType="custom" → 訓練日背景色
│   └── workout/
│       └── components/ExerciseBlock.tsx         # 器具（equipment）表示追加
```

**Structure Decision**: Option 3 (Mobile) — 既存のモノレポ構造に沿って変更

---

## Implementation Phases

### Phase A — Critical Fixes（P1・ブロッカー解消）

**目的**: シードデータ追加 + +ボタン修正 + StreakCard EmptyState 対応

#### A-1: シードデータ追加（migration v2）

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `database/seed.ts` | `generateDevWorkoutSeedSQL(db)` を追加。ベンチプレス・インクラインチェストプレスの ID を名前で検索し、2026/2/1 のワークアウト + workout_exercises + sets を INSERT OR IGNORE で投入 |
| `database/migrations.ts` | `LATEST_VERSION = 2`・`migrateV1ToV2` 追加。既存ワークアウトが 0 件の場合のみシードを実行 |

**設計判断（シード方式）**:

| 方式 | メリット | デメリット | 推奨 |
|------|---------|-----------|------|
| A: migration v2 として投入 | 自動実行、管理が明確 | DB リセットまでは 1 回のみ | ✅ 採用 |
| B: `__DEV__` フラグでアプリ起動時に投入 | 柔軟 | `__DEV__` は Hermes で動作不安定 | ✗ |
| C: 手動で Developer メニューから投入 | 制御しやすい | 開発体験が煩雑 | ✗ |

**根拠**: migration pattern が既存の仕組みとして確立されており、追加コストが最小。`INSERT OR IGNORE` で冪等性を担保し、exercises テーブルに名前で問い合わせて ID を取得する。

**DB 操作の詳細**:
```sql
-- 2026/2/1 00:00:00 JST = 1738332000000 (unix ms)
INSERT OR IGNORE INTO workouts (id, status, created_at, completed_at, elapsed_seconds)
VALUES ('<ulid>', 'completed', 1738332000000, 1738339200000, 7200);

-- exercises テーブルから name で ID を取得（seed.ts 内で JS で処理）
SELECT id FROM exercises WHERE name = 'ベンチプレス' LIMIT 1;
SELECT id FROM exercises WHERE name = 'インクラインベンチプレス' LIMIT 1;

-- workout_exercises と sets は ulid() で ID 生成して挿入
```

#### A-2: MainTabs.tsx — +ボタン修正

| 現状 | 修正後 |
|------|-------|
| `tabBarStyle` に `overflow` なし | `overflow: 'visible'` 追加 |
| `RecordTabButton` に `shadowColor` なし | iOS: `shadowColor/Offset/Radius/Opacity`、Android: `elevation: 8` |

```typescript
// tabBarStyle に追加
overflow: 'visible',

// RecordTabButton の Pressable style に追加
shadowColor: colors.primary,
shadowOffset: { width: 0, height: 4 },
shadowRadius: 16,
shadowOpacity: 0.4,
elevation: 8, // Android
```

**理由**: React Native の `box-shadow` は `shadow*` props（iOS）と `elevation`（Android）に分解する必要がある。

#### A-3: HomeScreen.tsx — EmptyState 分岐を廃止してレイアウトを統一

**背景**: ワイヤーフレーム HTML に EmptyState（💪 絵文字・誘導テキスト）は**存在しない**。データの有無に関わらず常に同一のレイアウトを表示するのが正しい実装。

**変更**:
- `if (workoutSummaries.length === 0) return <EmptyState />` の早期 return を**削除**
- 単一の return に統合し、常にヘッダー（挨拶 + StreakCard）+ メインを描画
- `workoutSummaries.length === 0` のとき、「最近のワークアウト」セクションヘッダーは表示するがカードは表示しない（ワイヤーフレームのセクション構造を維持）
- 💪 絵文字・「まだワークアウトがありません」テキストは**削除**

```
削除前:
  if (workoutSummaries.length === 0) return <EmptyState with 💪 />
  return <NormalLayout with StreakCard />

変更後:
  return (
    <View>
      <Header>  {/* 常に表示 */}
        挨拶テキスト + アバター
        <StreakCard />  {/* 0件でも表示: 今月0日 */}
      </Header>
      <ScrollView>
        <WeeklyGoals />                {/* 常に表示 */}
        <SectionHeader>最近のワークアウト</SectionHeader>  {/* 常に表示 */}
        {workoutSummaries.map(...)}    {/* 0件のとき何も表示しない */}
        <QuickStatsWidget />           {/* 常に表示 */}
      </ScrollView>
    </View>
  )
```

---

### Phase B — StreakCard 修正（P1）

**目的**: ワイヤーフレーム HTML の実際のデザインに準拠させる

**ワイヤーフレーム参照**: `L466〜L485`（`.streak-day-circle.done`・`.streak-day-circle.rest`・`.streak-day-label`）

| 項目 | 現状 | ワイヤーフレーム |
|------|------|----------------|
| done 円 | 青背景のみ | 青背景 + 白チェックマーク SVG（14×14px）|
| rest 円 | `colors.border` (#e2e8f0) | `rgba(77,148,255,0.10)` 薄い青 |
| 曜日ラベル | なし | `<Text>月</Text>〜<Text>日</Text>`（10px、primary 70% opacity）|

**変更ファイル**:

| ファイル | 変更内容 |
|---------|---------|
| `streakCardStyles.ts` | `rest` 時に `backgroundColor: 'rgba(77, 148, 255, 0.10)'` を返す |
| `StreakCard.tsx` | done 円に白チェックマーク SVG を追加 + 各インジケーター下に曜日ラベルを追加 |

**StreakCard のレイアウト変更**:
```tsx
// 現在: <View style={indicator}/> のみ
// 変更後:
<View className="flex-1 items-center" style={{ gap: 4 }}>
  <View style={{ width: 28, height: 28, borderRadius: 14, ...indicatorStyle }}>
    {day.isDone && <CheckmarkIcon />}  {/* 白チェック 14×14 */}
  </View>
  <Text style={{ fontSize: 10, color: colors.primary, opacity: 0.7 }}>
    {DAY_LABELS[index]}  {/* 月 火 水... */}
  </Text>
</View>
```

---

### Phase C — WeeklyGoals コンポーネント（P2）

**目的**: ワイヤーフレームの「今週の目標」セクションを新規実装

**新規ファイル**: `apps/mobile/src/features/home/components/WeeklyGoalsWidget.tsx`

**コンポーネント設計**:

```typescript
type WeeklyGoalsWidgetProps = {
  thisWeekWorkouts: number;      // 今週のワークアウト数
  thisWeekVolume: number;        // 今週の総負荷量（kg）
  lastWeekWorkouts: number;      // 前週のワークアウト数（前週比計算用）
  targetWorkouts?: number;       // 週の目標（デフォルト: 3）
};
```

**達成率計算**: `Math.min(Math.round((thisWeekWorkouts / targetWorkouts) * 100), 100)`

**HomeScreen.tsx への統合**:
- `workoutSummaries.length > 0` の場合のみ WeeklyGoals を表示
- 今週・前週のデータは既存の `trainingDates` から `date-fns` の `isWithinInterval` で集計

---

### Phase D — RecentWorkoutCard 改善（P2）

**目的**: ワイヤーフレームの `.task-card` デザインに準拠（種目アイコン + 名前 + 完了バッジ）

**現状との差異**:

| 要素 | 現状 | ワイヤーフレーム |
|------|------|----------------|
| 種目アイコン | なし | 40×40px カラー背景円形 + SVG |
| ワークアウト名 | 日付のみ | ワークアウト名（例: 胸・三頭トレーニング）+ 日時 |
| 完了バッジ | なし | `完了` バッジ（緑） |

**設計判断（ワークアウト名）**:
現在の DB に `workouts.name` カラムが存在するか確認が必要。存在する場合はそれを使用、存在しない場合は「種目数 + 部位」から自動生成（例: `胸トレーニング`）。`HomeScreen.tsx` の `WorkoutSummary` 型に `name` フィールドを追加して渡す。

**種目アイコン（部位別カラー）**:
- chest: `colors.primaryBg` 背景（青系）
- back: `#dcfce7` 背景（緑系）
- legs: `#fef3c7` 背景（黄系）
- shoulders/biceps/triceps: `#f3e8ff` 背景（紫系）
- mixed（複数部位）: `colors.neutralBg` 背景（グレー）

**RecentWorkoutCard の props 拡張**:
```typescript
type RecentWorkoutCardProps = {
  // 既存
  completedAt: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  durationSeconds: number;
  onPress: () => void;
  // 追加
  primaryMuscleGroup?: string;  // 代表部位（最も多い種目の部位）
};
```

---

### Phase E — カレンダー訓練日背景色（P2）

**目的**: `react-native-calendars` で訓練日セルに薄青背景を適用

**現状**: `dotColor` マーカーのみ（ドット表示）
**変更後**: `markingType="custom"` + `customStyles` で訓練日に `backgroundColor: colors.primaryBg`

**変更内容（MonthCalendar.tsx）**:

```typescript
// markingType を "custom" に変更
// markedDates の訓練日エントリを変更:
marks[dateStr] = {
  customStyles: {
    container: { backgroundColor: colors.primaryBg, borderRadius: 6 },
    text: { color: colors.textPrimary },
  },
};

// 選択日
marks[selectedDate] = {
  customStyles: {
    container: { backgroundColor: colors.primary, borderRadius: 6 },
    text: { color: colors.white, fontWeight: '700' },
  },
};
```

**注意**: `markingType="custom"` 使用時は `theme.selectedDayBackgroundColor` 等が無効になるため、全マーキングを `customStyles` で統一する。

---

### Phase F — ExerciseBlock 器具表示（P2）

**目的**: 種目名の下に筋肉グループ + 器具名を表示（FR-011）

**現状確認**: `ExerciseBlock.tsx:115` に `muscleLabel` は表示済み。器具ラベルの追加のみ必要。

```typescript
// 既存
<Text className="text-[12px] text-[#64748b] mt-[2px]">{muscleLabel}</Text>

// 変更後（1行で筋肉 + 器具を表示）
<Text className="text-[12px] text-[#64748b] mt-[2px]">
  {muscleLabel} · {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
</Text>
```

**器具の日本語ラベル追加**:
```typescript
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'バーベル', dumbbell: 'ダンベル', machine: 'マシン',
  cable: 'ケーブル', bodyweight: '自重', other: 'その他',
};
```

**注意**: `ExerciseBlock.tsx:110` の `border-b-[8px] border-[#F1F3F5]` は実装済み（FR-010 は対応完了）。

---

## 依存関係グラフ

```
Phase A-1（シードデータ）← 最優先（これが完了しないと他の UI 修正が確認できない）
Phase A-2（+ボタン）← Phase A-1 と並列実行可
Phase A-3（StreakCard EmptyState）← Phase A-1 と並列実行可

Phase B（StreakCard 修正）← Phase A-1 完了後に意味を成す（データがあると確認できる）
Phase C（WeeklyGoals）← Phase A-1 完了後
Phase D（RecentWorkoutCard）← Phase A-1 完了後
Phase E（カレンダー）← Phase A-1 完了後
Phase F（ExerciseBlock 器具）← Phase A-1 不要（記録画面で確認可能）
```

### 並列実行パターン（5 エージェント構成）

```
Agent 1: Phase A-1 → Phase B（シードデータ → StreakCard 修正）
Agent 2: Phase A-2 + A-3（MainTabs + HomeScreen EmptyState）
Agent 3: Phase C（WeeklyGoalsWidget 新規作成）
Agent 4: Phase D（RecentWorkoutCard 改善）
Agent 5: Phase E + F（MonthCalendar + ExerciseBlock）
```

---

## テスト戦略

### 各フェーズのテスト対象

| Phase | テストファイル | 検証内容 |
|-------|-------------|---------|
| A-1 | `database/__tests__/seed.test.ts` | `generateDevWorkoutSeedSQL` が正しい SQL を生成する |
| A-2 | `app/__tests__/MainTabs.test.tsx` | タブ数 5、RecordButton の testID 存在 |
| A-3 | `features/home/screens/__tests__/HomeScreen.test.tsx` | `workouts=0` 時に StreakCard が表示される |
| B | `features/home/components/__tests__/StreakCard.test.ts` | done: 青背景+チェック、rest: 薄青、曜日ラベル存在 |
| C | `features/home/components/__tests__/WeeklyGoalsWidget.test.tsx` | 3 カラム・プログレスバー・達成率計算 |
| D | `features/home/components/__tests__/RecentWorkoutCard.test.tsx` | 完了バッジ・種目アイコンの存在 |
| E | `features/calendar/components/__tests__/MonthCalendar.test.tsx` | customStyles マーキングの存在 |
| F | `features/workout/components/__tests__/ExerciseBlock.test.tsx` | 器具ラベルの存在 |

---

## ワイヤーフレーム参照

**ファイル**: `requirements/adopted/workout_plus_wireframes_v5_md3.html`

| セクション | 行範囲 | 参照内容 |
|-----------|--------|---------|
| タブバー CSS | L280〜L358 | `.add-button box-shadow`、`.tab-bar-item.center margin-top` |
| StreakCard CSS | L397〜L485 | `.streak-day-circle.done/rest`、`.streak-day-label` |
| WeeklyGoals HTML | L2953〜L2988 | goals-grid、progress-container |
| RecentWorkoutCard HTML | L2997〜L3030 | task-icon、task-header、status-badge |
| カレンダー | L3817〜L3923 | 訓練日セルスタイル |
| 記録画面 | L3128〜L3361 | 種目ヘッダー（名前・メタ） |
