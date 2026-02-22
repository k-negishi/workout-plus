---
description: git commit → push → GitHub Issue クローズ を一気通貫で実行する。
---

## ユーザー入力

```text
$ARGUMENTS
```

`$ARGUMENTS` は Issue番号として扱う。省略された場合は会話コンテキストから推定する。

## 目的

実装完了後の締め作業（commit → push → issue close）を1コマンドで実行するラッパー。

## 実行フロー

### Step 1: コミット（`/git-commit` スキル）

`/git-commit` スキルの手順に従い、変更差分を分析して適切な prefix でコミットを実行する。

- コミット前に `git status` と `git diff` で差分を確認する
- 複数目的が混在する場合はコミットを分割する
- コミットメッセージは日本語で記述する
- ステアリングファイル（`.claude/`, `.agents/`, `specs/` など）の変更が含まれている場合は、実装コミットとは**別コミット**に分ける

### Step 2: コミットハッシュを取得（push 前）

commit 直後・push 前のこのタイミングで、今回のタスク分のコミットを確定する。

```bash
git log origin/main..HEAD --pretty=format:"%h %H %s"
```

このハッシュを Step 3 の Issue クローズに引き渡す。
**push 後に取得すると別タスクのコミットが混入する恐れがあるため、必ず push 前に取得する。**

### Step 3: プッシュ

```bash
git push
```

- push が失敗した場合（例: upstream 未設定）は `git push -u origin <branch>` で再試行する
- force push は行わない

### Step 4: Issue クローズ（`/close-issue` スキル）

`/close-issue` スキルの手順に従い、Issue にコメントを追加してクローズする。

- Issue番号は `$ARGUMENTS` を使用する。空の場合は会話コンテキストから推定する
- コミットハッシュは Step 2 で取得したものを使う（`git log` を再実行しない）
- コメントには GitHub コミットURLをリンク形式で含める

## 失敗時の挙動

| ステップ | 失敗時の対応 |
|---|---|
| commit | 差分・エラー内容を提示してユーザーに判断を仰ぐ |
| push | エラーメッセージを提示し、手動 push を案内する |
| close-issue | Issue番号が不明な場合はユーザーに確認する |

いずれかのステップで失敗した場合は、残りのステップを実行せずに停止する。

## 最終レポート

```
✅ commit-close 完了

### コミット
- [<短縮ハッシュ>](<GitHubコミットURL>) — <コミットメッセージ>

### プッシュ
- ✅ origin/<ブランチ名>

### Issue
- ✅ Issue #<番号> クローズ: <タイトル>
- コメント追加: <URL>
```
