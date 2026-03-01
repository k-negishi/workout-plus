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
# リポジトリURLを取得
REPO_URL=$(gh repo view --json url -q .url)

# push 前にコミットがある場合（未 push 分）
git log origin/main..HEAD --pretty=format:"%H %h %s"

# push 済みの場合（main ブランチで直接作業＋push 後）は上が空になる。
# その場合は origin/main の直近コミットを取得する
git log origin/main -n 10 --pretty=format:"%H %h %s"
```

**コミットURLの組み立て方（必須）**:
```
${REPO_URL}/commit/${フルハッシュ}
例: https://github.com/xxx/workout-plus/commit/abc123def456...
```

> **注意**: `git log -1` は使わない。
> `origin/main..HEAD` が空（=push済み）の場合は `git log origin/main -n 10` で直近コミットを取得し、
> 会話コンテキスト（コミットメッセージ・変更ファイル）から Issue に関連するものを選択する。
> 複数コミットがある場合は全て列挙する。
> **コミット URL は必ずコメント本文に含めること。省略しない。**

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

<!-- ⚠️ 必須: git log で取得した実際のハッシュとメッセージを使う。テンプレート文字列のまま残さない。
     REPO_URL = gh repo view --json url -q .url の結果
     例: https://github.com/xxx/workout-plus/commit/abc123def456789... -->

- [`<7桁の短縮ハッシュ>`](<REPO_URL>/commit/<40桁のフルハッシュ>) — <コミットメッセージ>

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
