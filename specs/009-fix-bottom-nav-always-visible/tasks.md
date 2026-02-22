# Tasks: 下部ナビゲーションの常時固定表示

**Feature**: Issue #103
**Total**: 6 tasks

## User Story 1: ホームからの種目履歴閲覧

### T001: [TEST] ExerciseHistoryFullScreen テスト作成（Red フェーズ）
- **依存**: なし
- **並列可**: 不可（T002 の前に必要）
- **ファイル**: `apps/mobile/src/features/exercise/screens/__tests__/ExerciseHistoryFullScreen.test.tsx`
- **内容**:
  - [ ] 画面が正常にレンダリングされるテスト
  - [ ] 戻るボタン押下で `goBack()` が呼ばれるテスト
  - [ ] exerciseName が表示されるテスト
  - [ ] `useExerciseHistory` のモック設定
  - [ ] `react-native-gifted-charts` のモック設定

### T002: [IMPL] ExerciseHistoryFullScreen 型の汎用化（Green フェーズ）
- **依存**: T001
- **並列可**: 不可
- **ファイル**: `apps/mobile/src/features/exercise/screens/ExerciseHistoryFullScreen.tsx`
- **内容**:
  - [ ] `RecordStackParamList` への依存を削除
  - [ ] route params 型を `{ exerciseId: string; exerciseName: string }` に変更
  - [ ] navigation 型を `ParamListBase` ベースに変更
  - [ ] TypeScript エラーが 0 件であること確認

## User Story 2: カレンダーからの種目履歴閲覧

### T003: [VERIFY] HomeStack / CalendarStack の変更確認
- **依存**: なし
- **並列可**: T001 と並列可
- **ファイル**: `HomeStack.tsx`, `CalendarStack.tsx`, `navigation.ts`
- **内容**:
  - [ ] `HomeStack.tsx` に ExerciseHistory Screen が追加されていることを確認
  - [ ] `CalendarStack.tsx` に ExerciseHistory Screen が追加されていることを確認
  - [ ] `HomeStackParamList` に `ExerciseHistory` が存在することを確認
  - [ ] `CalendarStackParamList` に `ExerciseHistory` が存在することを確認
  - [ ] 上記が揃っていなければ追加する

## User Story 3: 記録フローでの動作確保

### T004: [TEST] HomeStack 内での ExerciseHistory 遷移テスト
- **依存**: T002, T003
- **並列可**: 不可
- **ファイル**: `apps/mobile/src/app/__tests__/HomeStack.test.tsx` (新規)
- **内容**:
  - [ ] HomeStack に ExerciseHistory が含まれていることを検証
  - [ ] WorkoutDetail → ExerciseHistory 遷移で navigation.navigate が呼ばれることを確認

## 品質検証

### T005: TypeScript コンパイルチェック
- **依存**: T002, T003
- **並列可**: T004 と並列可
- **コマンド**: `pnpm --filter mobile tsc --noEmit`
- **内容**:
  - [ ] TypeScript コンパイルエラーが 0 件

### T006: 全テスト実行
- **依存**: T001, T002, T003, T004, T005
- **並列可**: 不可
- **コマンド**: `pnpm --filter mobile test --testPathPattern="ExerciseHistoryFullScreen|HomeStack|MainTabs"`
- **内容**:
  - [ ] 新規テストが PASS
  - [ ] 既存テストが引き続き PASS
