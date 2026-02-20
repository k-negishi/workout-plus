---
description: 既存のタスクを設計アーティファクトに基づいた依存関係順のGitHub Issueに変換する。
tools: ['github/github-mcp-server/issue_write']
---

## ユーザー入力

```text
$ARGUMENTS
```

ユーザー入力が空でなければ、**必ず**内容を考慮してから進めること。

## 概要

1. リポジトリルートから `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` を実行し、FEATURE_DIRとAVAILABLE_DOCSリストを解析する。全パスは絶対パスであること。引数にシングルクォートを含む場合（例: "I'm Groot"）はエスケープ構文を使用: 例 'I'\''m Groot'（またはダブルクォート: "I'm Groot"）。
1. 実行されたスクリプトから **tasks** のパスを抽出する。
1. 以下を実行してGitリモートを取得する：

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> リモートがGitHub URLの場合のみ次のステップに進むこと

1. タスクリスト内の各タスクについて、GitHub MCPサーバーを使用して、GitリモートのURLに対応するリポジトリに新しいIssueを作成する。

> [!CAUTION]
> リモートURLに一致しないリポジトリにIssueを絶対に作成しないこと
