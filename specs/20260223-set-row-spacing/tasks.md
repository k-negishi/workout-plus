# タスクリスト: セット間行間拡大 (Issue #128)

## ユーザーストーリー 1: SetRow の行間を広くする

### T1: SetRow テストにスタイル検証を追加（Red フェーズ）

- **ファイル**: `apps/mobile/src/features/workout/components/__tests__/SetRow.test.tsx`
- **内容**: 外枠 View に `paddingVertical: 4` があることを検証するテストを追加
- **状態**: [X] 完了
- **並列**: 可（T3 と並列実行可能）

### T2: SetRow に paddingVertical を追加（Green フェーズ）

- **ファイル**: `apps/mobile/src/features/workout/components/SetRow.tsx`
- **内容**: 外枠 `View` に `paddingVertical: 4` を追加
- **状態**: [X] 完了
- **依存**: T1（テストが Red になってから実装）
- **並列**: 不可

## ユーザーストーリー 2: ExerciseBlock のセットコンテナ gap を広くする

### T3: ExerciseBlock テストにギャップ検証を追加（Red フェーズ）

- **ファイル**: `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx`
- **内容**: セットコンテナの `gap` が 12 であることを検証するテストを追加
- **状態**: [X] 完了
- **並列**: 可（T1 と並列実行可能）

### T4: ExerciseBlock のセットコンテナ gap を 12 に変更（Green フェーズ）

- **ファイル**: `apps/mobile/src/features/workout/components/ExerciseBlock.tsx`
- **内容**: セットリストコンテナの `gap: 8` を `gap: 12` に変更
- **状態**: [X] 完了
- **依存**: T3（テストが Red になってから実装）
- **並列**: 不可

## 検証

### T5: テスト・型チェック・Lint を実行

- **コマンド**:
  - `npx jest "SetRow|ExerciseBlock"` → 23 tests PASS
  - `npx tsc --noEmit` → エラーなし
  - `pnpm lint` → 0 errors（警告のみ）
- **状態**: [X] 完了
- **依存**: T2, T4

## 完了条件

- [X] T1 完了
- [X] T2 完了
- [X] T3 完了
- [X] T4 完了
- [X] T5 完了（全テスト PASS・型エラーなし・Lint エラーなし）
