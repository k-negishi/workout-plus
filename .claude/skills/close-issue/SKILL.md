# Close Issue スキル

GitHub Issueに実装完了のコメントを追加してクローズするスキルです。

## スキルの目的

- 実装完了後、GitHub Issueに詳細なコメントを自動生成して追加
- Issueを適切にクローズ
- 実装内容、品質チェック結果、関連仕様書を記録

## 使用タイミング

以下のタイミングで使用してください:

1. **実装完了後**: コードの実装とテストが完了し、コミット・プッシュ済み
2. **品質チェック完了後**: lint / test / tsc などの品質チェックが全てパス
3. **Issue対応完了時**: GitHub Issueで報告された問題や機能要求が完了した時

## 前提条件

**必須**:
- ✅ コードの実装が完了していること
- ✅ 全ての品質チェックがパスしていること
- ✅ git commit & git push が完了していること
- ✅ ghコマンドがインストールされていること

**推奨**:
- 対応する仕様書（`specs/<feature>/`）が作成されていること
- 変更内容がコミットメッセージに明確に記録されていること

## 使用方法

### 基本的な使い方

```bash
/close-issue <issue番号>
```

**例**:
```bash
/close-issue 5
```

### スキルが自動的に行うこと

1. **最新のコミット情報を取得**
   - コミットハッシュ
   - コミットメッセージ
   - 変更されたファイル

2. **実装サマリを生成**
   - 変更内容の概要
   - 変更されたファイルのリスト
   - 品質チェック結果

3. **Issueにコメントを追加**
   - 実装完了の報告
   - 変更内容の詳細
   - 品質保証の結果
   - 関連仕様書へのリンク

4. **Issueをクローズ**
   - 完了メッセージと共にクローズ

## 実行フロー

### ステップ1: コンテキスト収集

以下の情報を自動的に収集します:

```bash
# 1. 最新のコミット情報
git log -1 --pretty=format:"%H %s"

# 2. 変更されたファイル
git diff --name-only HEAD~1 HEAD

# 3. 仕様書の確認
ls specs/
```

### ステップ2: コメント内容の生成

以下のテンプレートでコメントを生成します:

```markdown
## ✅ 実装完了

[コミットメッセージから変更内容を抽出]

### 変更内容

**実装の詳細**:
- [変更されたファイル1]: [変更内容]
- [変更されたファイル2]: [変更内容]
- ...

### 品質チェック

- ✅ ESLint: パス（`pnpm lint`）
- ✅ Jest: パス（`pnpm --filter mobile test`）
- ✅ TypeScript: パス（`pnpm --filter mobile tsc --noEmit`）

### コミット

- Commit: [ハッシュ]
- Files changed: [統計]

### 関連ドキュメント

> 1つの spec から複数の Issue が生成されるため、同じ spec/plan を複数の Issue のクローズコメントから参照することになる。これは正常であり、まとめて記載して問題ない。

- 仕様書: `specs/[feature]/spec.md`
- 実装計画: `specs/[feature]/plan.md`

🤖 Generated with Claude Code
```

### ステップ3: Issueの更新

```bash
# 1. コメントを追加
gh issue comment <issue番号> --body "[生成されたコメント]"

# 2. Issueをクローズ
gh issue close <issue番号> --comment "実装完了しました。コミット [ハッシュ] で対応しました。"
```

### ステップ4: 結果の報告

ユーザーに以下を報告します:
- コメント追加のURL
- Issue クローズの確認
- 実装サマリ

## 実装手順（詳細）

### 手順1: 引数の確認

```
引数として Issue番号 を受け取る
例: /close-issue 5 → issue番号は "5"
```

### 手順2: 最新のコミット情報を取得

```bash
# コミットハッシュとメッセージ
git log -1 --pretty=format:"%h %s"

# 変更されたファイル
git diff --name-only HEAD~1 HEAD

# 変更統計
git diff --stat HEAD~1 HEAD
```

### 手順3: 仕様書の確認

```bash
# 対応する仕様書ディレクトリを確認
ls specs/
```

**重要**: 仕様書ディレクトリ名をコメントに含めること:
- 形式: `specs/<feature>/`
- 例: `specs/001-workout-core-screens/`

### 手順4: 品質チェック結果の取得

実装時に記録された品質チェック結果を使用:
- ESLint の結果（`pnpm lint`）
- Jest テストの結果（`pnpm --filter mobile test`）
- TypeScript 型チェックの結果（`pnpm --filter mobile tsc --noEmit`）

### 手順5: コメントの生成と追加

```bash
gh issue comment <issue番号> --body "$(cat <<'EOF'
[生成されたコメント]
EOF
)"
```

### 手順6: Issueのクローズ

```bash
gh issue close <issue番号> --comment "実装完了しました。コミット [ハッシュ] で対応しました。"
```

### 手順7: 結果の報告

ユーザーに以下を報告。URLは必ず提供すること:
```
✅ 完了しました

### GitHub Issue更新
- ✅ コメント追加: [URL]
- ✅ Issue #[番号]クローズ: [タイトル]

### 実装サマリ
- コミット: [ハッシュ]
- 変更ファイル: [件数] files
- 品質チェック: 全てパス
```

## エラーハンドリング

### エラー1: Issue番号が指定されていない

**対処法**: ユーザーに Issue番号の入力を促す

```
❌ エラー: Issue番号が指定されていません。

使用方法:
/close-issue <issue番号>

例:
/close-issue 5
```

### エラー2: ghコマンドが利用できない

**対処法**: ghコマンドのインストールを案内

```
❌ エラー: ghコマンドが見つかりません。

GitHub CLIをインストールしてください:
brew install gh
```

### エラー3: Issueが存在しない

**対処法**: Issue番号を確認してもらう

```
❌ エラー: Issue #[番号] が見つかりませんでした。

Issue番号を確認してください:
gh issue list
```

### エラー4: git pushがまだの場合

**対処法**: git pushを先に実行してもらう

```
❌ エラー: ローカルの変更がリモートにプッシュされていません。

先に以下を実行してください:
git push
```

## 使用例

### 例1: 基本的な使用

```
ユーザー: /close-issue 5

Claude:
Issue #5の情報を取得しています...
最新のコミット情報を収集しています...

✅ 完了しました

### GitHub Issue更新
- ✅ コメント追加: https://github.com/k-negishi/workout-plus/issues/5#issuecomment-123
- ✅ Issue #5クローズ: ワークアウト記録画面の実装

### 実装サマリ
- コミット: 5baa371
- 変更ファイル: 8 files
- 品質チェック: 全てパス
```

### 例2: エラーケース（git pushがまだ）

```
ユーザー: /close-issue 5

Claude:
❌ エラー: ローカルの変更がリモートにプッシュされていません。

先に以下を実行してください:
git push
```

## チェックリスト

スキル実行前に確認:

- [ ] コードの実装が完了している
- [ ] ESLint がパス（`pnpm lint`）
- [ ] Jest テストがパス（`pnpm --filter mobile test`）
- [ ] TypeScript 型チェックがパス（`pnpm --filter mobile tsc --noEmit`）
- [ ] git commit が完了している
- [ ] git push が完了している
- [ ] Issue番号を把握している

## トラブルシューティング

### 問題: コメントが追加されない

**原因**: ghコマンドの認証が切れている可能性

**解決策**:
```bash
gh auth status
gh auth login
```

### 問題: Issueがクローズされない

**原因**: リポジトリの権限が不足している可能性

**解決策**: リポジトリのオーナーまたは管理者に権限を確認

### 問題: コメント内容が正しくない

**原因**: 最新のコミット情報が取得できていない

**解決策**:
```bash
git log -1
git diff --stat HEAD~1 HEAD
```
で手動確認し、必要に応じてコメントを手動編集

## 参考資料

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub CLI - Issues](https://cli.github.com/manual/gh_issue)
- プロジェクトの `CLAUDE.md` - 開発ワークフロー
- `specs/` - 機能仕様書
