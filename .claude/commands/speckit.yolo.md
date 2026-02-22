---
description: 機能説明から specify → plan → tasks → implement を一気通貫で実行する。
handoffs:
  - label: 整合性を分析
    agent: speckit.analyze
    prompt: 実装結果を含めて spec/plan/tasks の整合性を分析してください
    send: true
---

## ユーザー入力

```text
$ARGUMENTS
```

`$ARGUMENTS` は機能説明として扱う。空の場合はエラーで中断する。

## 目的

`/speckit.yolo` は、以下4ステップを確認待ちなしで連続実行するラッパーコマンドである。

1. `/speckit.specify`
2. `/speckit.plan`
3. `/speckit.tasks`
4. `/speckit.analyze`
5. `/speckit.implement`

## 実行ポリシー

- 省略ステップ: `/speckit.clarify` と `/speckit.taskstoissues` は実行しない。
- 実装方針: TDD（Red → Green → Refactor）を必須とする。
- 失敗時: その時点で停止し、失敗ステップ・原因・再開コマンドを明示する。
- 進捗報告: 各ステップ完了ごとに成果物パスを報告する。
- チェックリスト: 未完了チェックリストがあっても、ユーザーが明示的に停止指定しない限り実装を続行する。

## 実行手順

### Step 1: 仕様作成（`/speckit.specify`）

- `$ARGUMENTS` をそのまま機能説明として渡す。
- 生成されたブランチ名、`FEATURE_DIR`、`spec.md` の絶対パスを記録する。

### Step 2: 計画作成（`/speckit.plan`）

- Step 1 で作成された機能コンテキストを使用して計画を生成する。
- `plan.md`、`research.md`、`data-model.md`、`quickstart.md`、`contracts/` の生成有無を記録する。

### Step 3: タスク生成（`/speckit.tasks`）

- Step 2 の成果物から `tasks.md` を生成する。
- 総タスク数、ユーザーストーリーごとのタスク数、並列実行可能タスク数を要約する。

### Step 4: 整合性分析（`/speckit.analyze`）

- Step 1〜3 の成果物を横断的に分析し、整合性レポートを生成する。
- 不整合の種類（例: 要件の矛盾、未定義項目、重複タスク）と影響範囲を特定する。
- 整合性レポートを要約し、重大な不整合がある場合はユーザーに明示する。

### Step 5: 実装実行（`/speckit.implement`）

- `tasks.md` を実行し、完了タスクを `[X]` に更新する。
- テスト・型チェック・Lint の実行結果を収集する。
- 失敗タスクがあれば ID 単位で列挙し、継続可否を明示する。

## 最終レポート

最終出力では以下を必ず提示する。

- ブランチ名
- `FEATURE_DIR` と主要成果物のパス
- 完了タスク数 / 総タスク数
- 実行した検証コマンドと結果（PASS/FAIL）
- 失敗・保留事項（存在する場合）
- 推奨次アクション（例: `/speckit.analyze`）
