---
name: close-issue
description: 実装完了・品質チェック通過・git push 済みのタイミングで GitHub Issue にクローズする。コミット情報・変更ファイル・品質チェック結果・関連仕様書を含む完了レポートを自動生成して Issue にコメント追加後、クローズまで行う。issue番号は引数（`/close-issue <issue番号>`）または会話コンテキストから推定する。
allowed-tools: Bash
---

# Close Issue スキル

GitHub Issue に実装完了コメントを追加してクローズするスキルです。

## 前提条件

- git commit & git push が完了していること
- `gh` コマンドが使えること（`brew install gh`）

## Issue番号の決定

以下の優先順位で決定する:

1. 引数が指定されている場合はそれを使う（例: `/close-issue 5` → `5`）
2. 引数がない場合は会話コンテキストから推定する
   - 直近の会話で言及された番号（例: `#108`、`Issue 42`）
   - ブランチ名に含まれる番号（例: `feature/issue-42` → `42`）
   - 推定できなければユーザーに確認する

## 実行手順

### 1. コミット情報の収集

```bash
git log origin/main..HEAD --pretty=format:"%h %H %s"
# → origin/main に未送信のコミット（=今回のタスク分）を取得
# → 短縮ハッシュ・フルハッシュ・コミットメッセージの一覧

REPO_URL=$(gh repo view --json url -q .url)
# → コミットURLを組み立てる: ${REPO_URL}/commit/${FULL_HASH}
```

> **注意**: `git log -1` は使わない。直近1件を取るだけなので、別タスクのコミットが混入する恐れがある。
> `origin/main..HEAD` なら「このタスクで push したコミット」だけに絞れる。
> 複数コミットがある場合は全てコメントに列挙する。

### 2. コメントを投稿

```bash
gh issue comment <issue番号> --body "$(cat <<'EOF'
<コメント本文>
EOF
)"
```

### 3. Issue をクローズ

```bash
gh issue close <issue番号>
```

## コメント本文テンプレート

GitHub に投稿するコメントは以下の構成で作成する。
各セクションは **実際の情報を元に具体的に記述**すること（雛形のままにしない）。

```markdown
## ✅ 実装完了

<!-- Issue のタイトル・本文を踏まえて、何を実装・修正したかを2〜3文で要約する。
     「何が問題だったか → どう解決したか」の流れで書く。 -->

### 実装内容

<!-- 変更したファイルごとに、何をなぜ変えたかを箇条書きで説明する。
     ファイルパスは backtick で囲む。技術的な判断理由も1行添える。 -->

- `apps/mobile/src/...`: ...
- `apps/mobile/src/...`: ...

### 品質チェック

<!-- 実際に実行したコマンドと結果を記載する。
     未実行の場合は ⚠️ で明示する。 -->

| チェック | コマンド | 結果 |
|---|---|---|
| ESLint | `pnpm lint` | ✅ パス |
| Jest | `pnpm --filter mobile test` | ✅ パス（XX tests） |
| TypeScript | `pnpm --filter mobile tsc --noEmit` | ✅ パス |

### コミット

<!-- コミットURLをリンク形式で記載する。複数コミットがあれば全て列挙する。 -->

- [`<短縮ハッシュ>`](<REPO_URL>/commit/<フルハッシュ>) — <コミットメッセージ>

### 関連仕様書

<!-- 対応する specs/ ディレクトリのファイルをリンクする。
     1 spec から複数 Issue が出ることがあるので、同じ spec を複数 Issue から参照してよい。
     仕様書が存在しない場合はこのセクションを省略する。 -->

- 仕様書: `specs/<feature>/spec.md`
- 実装計画: `specs/<feature>/plan.md`
```

## 実行後の報告

ユーザーへの報告フォーマット（URLは必ず含める）:

```
✅ 完了

- Issue #<番号> クローズ: <タイトル>
- コメント: <comment URL>
- コミット: <commit URL>
```

## エラーハンドリング

| エラー | 対処 |
|---|---|
| Issue番号が不明 | ユーザーに確認する |
| `gh` コマンドが無い | `brew install gh` を案内する |
| Issue が存在しない | `gh issue list` で番号を確認するよう案内する |
| push 未完了 | `git push` を先に実行するよう案内して停止する |
