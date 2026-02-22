# Research: ワイヤーフレーム完全準拠 UI 修正

**Phase**: 0 — Research
**Date**: 2026-02-22

---

## 調査 1: ワイヤーフレーム HTML の CSS 問題の根本原因

### 決定
ワイヤーフレーム HTML の CSS 自体に問題はない。「CSS が当たっていない状態」に見えた原因は **アプリのデータが 0 件** であり、`HomeScreen.tsx` の EmptyState 分岐で StreakCard がレンダリングされていないことが原因。

### 根拠
`HomeScreen.tsx:211` の `if (workoutSummaries.length === 0)` ブランチは StreakCard を含まない。データなし → StreakCard なし → 画面が「CSS なし」のように見える。

### 検討した代替解釈
- ブラウザで HTML ファイルを開いた際の Google Fonts CDN 読み込み失敗 → フォント以外は問題なし
- VS Code 等のエディター内プレビューでの CSS 未適用 → インライン `<style>` タグは常に適用される
- ワイヤーフレーム HTML 自体の CSS バグ → 実際に読んだところ CSS は正しく定義されていた

---

## 調査 2: StreakCard のデザイン（曜日ラベル + チェックマーク）

### 決定
ワイヤーフレーム HTML に準拠し、**曜日ラベル + 完了日チェックマーク** を実装する。

### 根拠
`requirements/adopted/workout_plus_wireframes_v5_md3.html` の L2919〜2946 を実際に読んだ結果：
- `.streak-day-circle.done` → 青背景 + チェックマーク SVG（`<polyline points="20 6 9 17 4 12">`）
- `.streak-day-label` → 曜日テキスト（月・火・水...）が各円の下に存在する

spec 002 の tasks.md T021 が「曜日ラベル削除・チェックマーク削除」と指示していたのは、CSS が適用されていない状態の HTML テキストを読んで誤解したと思われる。

### 検討した代替案
- 曜日ラベルなし・チェックマークなし（spec 002 方針）→ ワイヤーフレームと不一致
- 曜日ラベルのみ（チェックマークなし）→ 視覚的フィードバックが弱い

---

## 調査 3: react-native-calendars の訓練日背景色実装方式

### 決定
`markingType="custom"` + `customStyles` を使用して訓練日セルに背景色を適用する。

### 根拠
`react-native-calendars` のマーキングタイプ比較：

| マーキングタイプ | 訓練日背景色 | 実装コスト | 備考 |
|---------------|------------|---------|------|
| `dot`（現状） | ❌ ドットのみ | 低 | 背景色は不可 |
| `period` | ❌ 期間ハイライト | 高 | 連続日用 |
| `custom` | ✅ 任意スタイル | 中 | セル単位でスタイル指定可能 |
| `multi-dot` | ❌ 複数ドット | 中 | 背景色は不可 |

`markingType="custom"` では `customStyles.container.backgroundColor` でセル背景色を設定できる。選択状態・今日・訓練日すべてを `customStyles` で統一管理する。

### 注意事項
- `markingType="custom"` 使用時は `theme.selectedDayBackgroundColor` 等の theme スタイルが無効
- 全マーキング（選択・今日・訓練日）を `customStyles` に統一する必要がある
- `react-native-calendars` のバージョンを確認（現在: `react-native-calendars` の version 未確認）

---

## 調査 4: シードデータの投入方式

### 決定
**migration v2** として `migrateV1ToV2` に実装する。既存ワークアウトが 0 件の場合のみ投入する冪等性ガード付き。

### 根拠
既存の migration pattern（`PRAGMA user_version`）が確立されており、追加コストが最小。`client.ts` を変更せずに `migrations.ts` + `seed.ts` のみで完結する。

### 設計詳細
1. `seed.ts` に `generateDevWorkoutSeedSQL(db: SQLiteDatabase): Promise<string>` を追加
2. 関数内で `SELECT id FROM exercises WHERE name = 'ベンチプレス'` で動的に exercise ID を取得
3. 取得した ID を使って workout / workout_exercises / sets を生成
4. 既存 workout が 0 件の場合のみ実行（`SELECT COUNT(*) FROM workouts WHERE status = 'completed'` でガード）

**シードデータ仕様**:
- 日時: 2026-02-01 00:00:00 JST（`1738332000000` ms）→ 完了: 2026-02-01 02:00:00（7200秒）
- ベンチプレス: 3セット（60kg×10, 65kg×8, 70kg×5）
- インクラインベンチプレス: 3セット（50kg×10, 55kg×8, 55kg×6）

---

## 調査 5: +ボタンの box-shadow（React Native）

### 決定
iOS: `shadow*` props（`shadowColor, shadowOffset, shadowRadius, shadowOpacity`）
Android: `elevation: 8`

### 根拠
React Native に Web の `box-shadow` プロパティはなく、プラットフォーム別に実装が必要：
- iOS: `shadow*` は `StyleSheet` で使用可能。`shadowColor` に色指定、`shadowOffset.height` で Y 方向の影
- Android: `elevation` のみ（影の色・形状は変更不可）

ワイヤーフレームの CSS `0 4px 16px rgba(77,148,255,0.4)` を近似値で実装：
```typescript
shadowColor: colors.primary,     // '#4D94FF'
shadowOffset: { width: 0, height: 4 },
shadowRadius: 8,                  // CSS 16px の半分相当（RN はぼかし半径）
shadowOpacity: 0.4,
elevation: 8,                     // Android
```

---

## 調査 6: WeeklyGoals の「達成率」計算ロジック

### 決定
固定目標 3 回/週（`DEFAULT_WEEKLY_TARGET = 3`）を使い、`(今週実績 / 目標) × 100` で達成率を計算する。

### 根拠
- 目標設定機能は MVP スコープ外
- ユーザーが週 3 回程度のトレーニングを想定したデフォルト値として 3 が妥当
- 前週比（`thisWeek - lastWeek`）はパーセント変化として表示

### 前週比の計算
`date-fns` の `subWeeks(startOfWeek(now), 1)` で前週の開始日を取得し、前週の `trainingDates` 数を集計する。HomeScreen.tsx の `useMemo` 内で一緒に計算する。
