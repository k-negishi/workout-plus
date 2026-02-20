---
description: tasks.md に定義された全タスクを処理・実行して実装計画を遂行する。
---

## ユーザー入力

```text
$ARGUMENTS
```

ユーザー入力が空でなければ、**必ず**内容を考慮してから進めること。

## 概要

1. リポジトリルートから `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` を実行し、FEATURE_DIRとAVAILABLE_DOCSリストを解析する。全パスは絶対パスであること。引数にシングルクォートを含む場合（例: "I'm Groot"）はエスケープ構文を使用: 例 'I'\''m Groot'（またはダブルクォート: "I'm Groot"）。

2. **チェックリストのステータス確認**（FEATURE_DIR/checklists/ が存在する場合）：
   - checklists/ ディレクトリ内の全チェックリストファイルをスキャン
   - 各チェックリストについてカウント：
     - 総項目数: `- [ ]` または `- [X]` または `- [x]` にマッチする全行
     - 完了項目数: `- [X]` または `- [x]` にマッチする行
     - 未完了項目数: `- [ ]` にマッチする行
   - ステータステーブルを作成：

     ```text
     | チェックリスト | 総数 | 完了 | 未完了 | ステータス |
     |--------------|------|------|--------|-----------|
     | ux.md        | 12   | 12   | 0      | ✓ PASS    |
     | test.md      | 8    | 5    | 3      | ✗ FAIL    |
     | security.md  | 6    | 6    | 0      | ✓ PASS    |
     ```

   - 全体ステータスを判定：
     - **PASS**: 全チェックリストの未完了項目が0
     - **FAIL**: 1つ以上のチェックリストに未完了項目あり

   - **未完了のチェックリストがある場合**：
     - 未完了項目数を含むテーブルを表示
     - **停止**して確認: 「一部のチェックリストが未完了です。それでも実装を進めますか？（yes/no）」
     - ユーザーの回答を待つ
     - ユーザーが「no」「待って」「stop」と答えた場合は実行を中止
     - ユーザーが「yes」「proceed」「続行」と答えた場合はステップ3へ進む

   - **全チェックリストが完了している場合**：
     - 全チェックリストがパスしたことを示すテーブルを表示
     - 自動的にステップ3へ進む

3. 実装コンテキストを読み込み分析：
   - **必須**: tasks.md を読み込み、完全なタスクリストと実行計画を把握
   - **必須**: plan.md を読み込み、技術スタック、アーキテクチャ、ファイル構成を把握
   - **存在する場合**: data-model.md を読み込み、エンティティとリレーションを把握
   - **存在する場合**: contracts/ を読み込み、API仕様とテスト要件を把握
   - **存在する場合**: research.md を読み込み、技術的決定と制約を把握
   - **存在する場合**: quickstart.md を読み込み、統合シナリオを把握

4. **プロジェクトセットアップの検証**：
   - **必須**: 実際のプロジェクトセットアップに基づいて除外ファイルを作成/検証：

   **検出と作成ロジック**：
   - 以下のコマンドが成功するか確認してgitリポジトリかどうかを判定（gitリポジトリの場合は.gitignoreを作成/検証）：

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Dockerfile* が存在するか plan.md にDockerが記載されているか → .dockerignore を作成/検証
   - .eslintrc* が存在するか → .eslintignore を作成/検証
   - eslint.config.* が存在するか → 設定の `ignores` エントリが必要なパターンをカバーしているか確認
   - .prettierrc* が存在するか → .prettierignore を作成/検証
   - .npmrc または package.json が存在するか → .npmignore を作成/検証（公開する場合）
   - terraformファイル（*.tf）が存在するか → .terraformignore を作成/検証
   - .helmignore が必要か（helmチャートが存在するか） → .helmignore を作成/検証

   **除外ファイルが既に存在する場合**: 必須パターンが含まれているか確認し、不足している重要なパターンのみ追加
   **除外ファイルが欠落している場合**: 検出された技術に対する完全なパターンセットで作成

   **技術別の一般的なパターン**（plan.mdの技術スタックから）：
   - **Node.js/JavaScript/TypeScript**: `node_modules/`、`dist/`、`build/`、`*.log`、`.env*`
   - **Python**: `__pycache__/`、`*.pyc`、`.venv/`、`venv/`、`dist/`、`*.egg-info/`
   - **Java**: `target/`、`*.class`、`*.jar`、`.gradle/`、`build/`
   - **C#/.NET**: `bin/`、`obj/`、`*.user`、`*.suo`、`packages/`
   - **Go**: `*.exe`、`*.test`、`vendor/`、`*.out`
   - **Ruby**: `.bundle/`、`log/`、`tmp/`、`*.gem`、`vendor/bundle/`
   - **PHP**: `vendor/`、`*.log`、`*.cache`、`*.env`
   - **Rust**: `target/`、`debug/`、`release/`、`*.rs.bk`、`*.rlib`、`*.prof*`、`.idea/`、`*.log`、`.env*`
   - **Kotlin**: `build/`、`out/`、`.gradle/`、`.idea/`、`*.class`、`*.jar`、`*.iml`、`*.log`、`.env*`
   - **C++**: `build/`、`bin/`、`obj/`、`out/`、`*.o`、`*.so`、`*.a`、`*.exe`、`*.dll`、`.idea/`、`*.log`、`.env*`
   - **C**: `build/`、`bin/`、`obj/`、`out/`、`*.o`、`*.a`、`*.so`、`*.exe`、`Makefile`、`config.log`、`.idea/`、`*.log`、`.env*`
   - **Swift**: `.build/`、`DerivedData/`、`*.swiftpm/`、`Packages/`
   - **R**: `.Rproj.user/`、`.Rhistory`、`.RData`、`.Ruserdata`、`*.Rproj`、`packrat/`、`renv/`
   - **共通**: `.DS_Store`、`Thumbs.db`、`*.tmp`、`*.swp`、`.vscode/`、`.idea/`

   **ツール固有のパターン**：
   - **Docker**: `node_modules/`、`.git/`、`Dockerfile*`、`.dockerignore`、`*.log*`、`.env*`、`coverage/`
   - **ESLint**: `node_modules/`、`dist/`、`build/`、`coverage/`、`*.min.js`
   - **Prettier**: `node_modules/`、`dist/`、`build/`、`coverage/`、`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`
   - **Terraform**: `.terraform/`、`*.tfstate*`、`*.tfvars`、`.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`、`secrets/`、`.kube/`、`kubeconfig*`、`*.key`、`*.crt`

5. tasks.md の構造を解析し以下を抽出：
   - **タスクフェーズ**: セットアップ、テスト、コア、統合、仕上げ
   - **タスクの依存関係**: 順次実行 vs 並列実行のルール
   - **タスクの詳細**: ID、説明、ファイルパス、並列マーカー [P]
   - **実行フロー**: 順序と依存関係の要件

6. タスク計画に従って実装を実行：
   - **フェーズごとの実行**: 各フェーズを次に進む前に完了させる
   - **依存関係の尊重**: 順次タスクは順番に実行、並列タスク [P] は同時実行可能
   - **TDDアプローチに従う**: テストタスクを対応する実装タスクの前に実行
   - **ファイルベースの調整**: 同じファイルに影響するタスクは順次実行
   - **検証チェックポイント**: 次に進む前に各フェーズの完了を検証

7. 実装の実行ルール：
   - **セットアップ最優先**: プロジェクト構造、依存関係、設定を初期化
   - **コードの前にテスト**: コントラクト、エンティティ、統合シナリオのテストを記述する必要がある場合
   - **コア開発**: モデル、サービス、CLIコマンド、エンドポイントを実装
   - **統合作業**: データベース接続、ミドルウェア、ログ、外部サービス
   - **仕上げと検証**: ユニットテスト、パフォーマンス最適化、ドキュメント

8. 進捗追跡とエラーハンドリング：
   - 各タスク完了後に進捗を報告
   - 非並列タスクが失敗した場合は実行を停止
   - 並列タスク [P] の場合は成功したタスクを続行し、失敗したタスクを報告
   - デバッグのためのコンテキスト付き明確なエラーメッセージを提供
   - 実装が続行できない場合は次のステップを提案
   - **重要** 完了したタスクは tasks ファイルで [X] としてマークすること。

9. 完了時の検証：
   - 全ての必須タスクが完了していることを確認
   - 実装された機能が元の仕様と一致することを確認
   - テストがパスし、カバレッジが要件を満たしていることを検証
   - 実装が技術計画に従っていることを確認
   - 完了した作業のサマリー付き最終ステータスを報告

注意: このコマンドは tasks.md に完全なタスク分解が存在することを前提とする。タスクが不完全または欠落している場合は、まず `/speckit.tasks` を実行してタスクリストを再生成することを提案する。
