# Implementation Plan: 当日ワークアウト継続登録

**Branch**: `main` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/20260222-当日ワークアウト継続登録/spec.md`

---

## Summary

当日完了済みワークアウットが存在する場合、+ボタンから既存ワークアウットに種目を追記できるようにする。
実装アプローチは「既存ワークアウットを recording に再オープンし、完了時に再度 completed に戻す」方式を採用。
RecordScreen を継続モードと新規モードで共用し、コンポーネントの新規作成は最小限に抑える。

---

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.81.5 (Expo SDK 52)
**Primary Dependencies**: Zustand, expo-sqlite ~15.2.0, React Navigation v7, NativeWind v4, @testing-library/react-native, Jest 29
**Storage**: SQLite via expo-sqlite（既存スキーマ変更なし、リポジトリメソッド追加のみ）
**Testing**: Jest 29 + @testing-library/react-native（カバレッジ目標 90%+）
**Target Platform**: iOS 16+ / Android 10+ (Expo Managed Workflow)
**Project Type**: Mobile (React Native / Expo)
**Performance Goals**: +ボタンタップから継続モード画面表示まで 2 秒以内
**Constraints**: オフライン完全動作必須、ローカル SQLite のみ、新規テーブル不要
**Scale/Scope**: 単一モバイルアプリ。影響ファイル数 6 件

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|------|------|------|
| I. ローカルファースト | ✅ 合格 | SQLite のみ使用。ネットワーク依存なし |
| II. 引き算のデザイン | ✅ 合格 | 新規スクリーンなし。既存 RecordScreen を継続モードで流用 |
| III. MVPスコープ厳守 | ✅ 合格 | スマホ単独完結。サーバー連携なし |
| IV. マネージドサービス専用 | ✅ 合格（N/A） | インフラ変更なし |
| V. 個人開発の持続可能性 | ✅ 合格 | モノレポ内完結。影響範囲を最小化 |
| VI. テスト・品質規律 | ✅ 合格（要実施） | テスト先行（TDD）で実装。カバレッジ 90%+ 維持 |

**Constitution Check 結果**: 全原則合格。違反事項なし。

---

## Project Structure

### Documentation (this feature)

```text
specs/20260222-当日ワークアウト継続登録/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # 仕様品質チェックリスト
└── tasks.md             # Phase 2 output (/speckit.tasks で生成)
```

### Source Code (変更対象ファイル)

```text
apps/mobile/src/
├── database/
│   └── repositories/
│       └── workout.ts                   # findTodayCompleted() メソッド追加
├── stores/
│   └── workoutSessionStore.ts          # continuationBaseExerciseIds フィールド追加
├── features/workout/
│   ├── hooks/
│   │   └── useWorkoutSession.ts        # startSession() 拡張・discardWorkout() 分岐追加
│   └── screens/
│       └── RecordScreen.tsx            # route.params.workoutId を startSession に渡す
├── app/
│   └── MainTabs.tsx                    # +ボタン onPress に当日チェック追加
└── types/
    └── navigation.ts                   # RecordStackParamList.Record 型拡張

apps/mobile/src/ (テストファイル)
├── database/repositories/__tests__/
│   └── workout.test.ts                 # findTodayCompleted() のテスト追加
├── stores/__tests__/
│   └── workoutSessionStore.test.ts     # continuationBaseExerciseIds のテスト
└── features/workout/
    ├── hooks/__tests__/
    │   └── useWorkoutSession.continuation.test.ts  # 継続モードのフックテスト
    └── screens/__tests__/
        └── RecordScreen.continuation.test.tsx      # RecordScreen 継続モードの統合テスト
```

---

## Implementation Phases

### Phase A: リポジトリ層（基盤）

**目的**: データアクセス層の拡張。他フェーズの前提条件。

**変更対象**: `workout.ts`（リポジトリ）

**実装内容**:
```
WorkoutRepository.findTodayCompleted():
  - 端末ローカル時刻でその日（00:00:00 〜 翌日 00:00:00）の範囲を計算
  - SELECT * FROM workouts
    WHERE status = 'completed'
    AND completed_at >= :dayStart
    AND completed_at < :dayEnd
    ORDER BY completed_at DESC LIMIT 1
  - WorkoutRow | null を返す
```

**テスト**: `findTodayCompleted()` のユニットテスト（当日あり・なし・複数の場合）

---

### Phase B: ストア層

**目的**: Zustand store に継続モードの状態を追加。

**変更対象**: `workoutSessionStore.ts`

**実装内容**:
```
State 追加:
  continuationBaseExerciseIds: string[] | null  // null = 継続モードでない

Action 追加:
  setContinuationBaseExerciseIds: (ids: string[] | null) => void

reset() の拡張:
  continuationBaseExerciseIds を null にリセット
```

---

### Phase C: フック層（コアロジック）

**目的**: `useWorkoutSession` に継続モード処理を追加。最も複雑な変更。

**変更対象**: `useWorkoutSession.ts`

**実装内容**:

#### startSession() の拡張

```
startSession(workoutId?: string):

  [継続モード: workoutId が指定されている]
    1. WorkoutRepository.findById(workoutId) で対象ワークアウット取得
    2. WorkoutRepository.update(id, { status: 'recording' }) で再オープン
    3. WorkoutExerciseRepository で種目リストを取得（displayOrder順）
    4. 各種目の SetRepository.findByWorkoutExerciseId() でセット取得
    5. store.setCurrentWorkout() / addExercise() / setSetsForExercise() で復元
    6. store.setTimerStatus('notStarted')  // タイマーはリセット
    7. store.setElapsedSeconds(0)
    8. store.setContinuationBaseExerciseIds([取得した種目IDリスト])

  [既存復帰: workoutId なし + findRecording() で発見]
    → 変更なし（既存ロジックをそのまま維持）

  [新規作成: workoutId なし + recording なし]
    → 変更なし（既存ロジックをそのまま維持）
```

#### discardWorkout() の分岐追加

```
discardWorkout():
  [継続モード (continuationBaseExerciseIds !== null)]:
    1. store.currentExercises から continuationBaseExerciseIds に含まれない種目を抽出
    2. 新規種目を WorkoutExerciseRepository.delete() で削除（CASCADE で sets も削除）
    3. WorkoutRepository.update(workoutId, {
         status: 'completed',
         // completed_at は変更しない
       })
    4. store.reset()
    5. navigation.goBack() または RecordStack を pop

  [通常モード (continuationBaseExerciseIds === null)]:
    → 変更なし（WorkoutRepository.delete() で全削除）
```

**テスト**:
- `startSession(workoutId)` の継続モード動作
- `discardWorkout()` の継続モード分岐（新規種目削除・既存データ保護）
- 完了後に全種目が含まれることの確認

---

### Phase D: ナビゲーション型

**目的**: TypeScript 型定義の拡張。

**変更対象**: `navigation.ts`

**実装内容**:
```typescript
// RecordStackParamList
Record: { workoutId?: string } | undefined;

// RootStackParamList（RecordStack の入り口）
RecordStack: { workoutId?: string } | undefined;
```

---

### Phase E: RecordScreen（パラメータ受け取り）

**目的**: `route.params.workoutId` を `startSession()` に渡す。

**変更対象**: `RecordScreen.tsx`

**実装内容**:
```typescript
const route = useRoute<RouteProp<RecordStackParamList, 'Record'>>();
const workoutId = route.params?.workoutId;

useEffect(() => {
  void session.startSession(workoutId);
}, []);
```

**変更規模**: 数行のみ（最小変更）

---

### Phase F: WorkoutDetailScreen（詳細画面への継続ボタン追加）

**目的**: 詳細画面から直接継続モードへ入れる導線を提供。編集ボタンとの混乱を防ぐ。

**変更対象**: `WorkoutDetailScreen.tsx`

**実装内容**:
```
- workoutId と当日日付を比較し、当日のワークアウットかどうかを判定
- 当日の場合のみ「続きを記録」ボタンを表示
- タップで navigation.navigate('RecordStack', { workoutId }) を実行
- HomeStack / CalendarStack 両方からのアクセスに対応
```

**テスト**:
- 当日ワークアウット → 「続きを記録」ボタンが表示される
- 過去のワークアウット → ボタンが表示されない
- ボタンタップ → 正しい workoutId で RecordStack へ遷移

---

### Phase G: +ボタン（エントリーポイント）

**目的**: +ボタンに当日ワークアウット存在チェックを追加。

**変更対象**: `MainTabs.tsx`

**実装内容**:
```typescript
const handleRecordPress = async () => {
  // 1. recording 中のセッションを優先
  const recording = await WorkoutRepository.findRecording();
  if (recording) {
    navigation.navigate('RecordStack');
    return;
  }

  // 2. 当日の完了済みワークアウットを確認
  const todayWorkout = await WorkoutRepository.findTodayCompleted();
  if (todayWorkout) {
    navigation.navigate('RecordStack', { workoutId: todayWorkout.id });
    return;
  }

  // 3. 新規作成
  navigation.navigate('RecordStack');
};
```

**テスト**:
- 当日ワークアウットあり → `workoutId` 付きでナビゲート
- recording あり → パラメータなしでナビゲート
- どちらもなし → パラメータなしでナビゲート

---

## 実装順序と依存関係

```
Phase A (リポジトリ) ─┬─ Phase B (ストア)
                      │          ↓
                      └── Phase C (フック) ← A + B が前提
                                 ↓
                          Phase D (型定義) ← C と並行可
                                 ↓
                    ┌────── Phase E (RecordScreen) ← D が前提
                    │       Phase F (DetailScreen) ← A, D が前提
                    └────── Phase G (+ボタン)      ← A, D が前提
```

**並列実行可能**:
- Phase A + Phase B は独立して並列実行可能
- Phase D は Phase C と並行して作業可能
- Phase E / F / G は Phase D 完了後に並列実行可能

---

## テスト戦略

**TDD 必須**: 実装コードを書く前にテストを書く（CLAUDE.md 規約）

| フェーズ | テストファイル | テスト対象 |
|----------|---------------|-----------|
| A | `repositories/__tests__/workout.test.ts` | `findTodayCompleted()` のユニットテスト |
| B | `stores/__tests__/workoutSessionStore.test.ts` | `continuationBaseExerciseIds` の初期値・更新・reset |
| C | `hooks/__tests__/useWorkoutSession.continuation.test.ts` | 継続モードの startSession・discardWorkout |
| E+F | `screens/__tests__/RecordScreen.continuation.test.tsx` | 継続モードの E2E フロー |
| F | `app/__tests__/MainTabs.continuation.test.tsx` | +ボタンの分岐ロジック |

**カバレッジ目標**: 変更ファイル全体で 90%+

---

## 非対象事項（スコープ外）

- 継続モード専用の UI 表示（「継続中」バッジ等）→ 将来機能として Deferred
- 当日以外のワークアウットへの継続（カレンダーから過去のワークアウットに追記）→ Deferred
- 継続可能なワークアウットが存在することをホーム画面で通知 → Deferred
- 編集モードと継続モードの統合（現時点では責務を分離して維持）→ 将来検討
