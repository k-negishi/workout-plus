---
name: git-commit
description: Gitコミット時に変更内容を分析し、コミットprefix（add/fix/docs/refactor/test/chore/perf/build/ci/revert/style）を適切に選定して、明確で追跡可能なコミットメッセージを作成・実行するためのスキル。コミットメッセージ作成、prefix選定、複数変更の分割判断、コミット実行時に使用する。
allowed-tools: Read, Write, Bash
---

# Git Commit スキル

変更差分を根拠に、適切な `prefix` を決定して高品質なコミットを作るためのスキルです。

## このスキルで採用するprefix

- `add`: ユーザー価値が増える機能追加・仕様追加
- `fix`: バグ修正・不具合是正
- `docs`: ドキュメントのみ変更(md、README等)
- `refactor`: 振る舞いを変えない内部改善
- `test`: テスト追加・修正
- `chore`: 雑務的変更（設定、依存更新、軽微保守）
- `perf`: パフォーマンス改善
- `build`: ビルドシステムや依存解決の変更
- `ci`: CI/CD設定の変更
- `revert`: 既存コミットの取り消し
- `style`: フォーマットやlintのみ（意味的変更なし）

## 基本方針

- 対象はそのコンテキスト内で変更したもののみ。コンテキスト外の変更は別コミットで管理する。
- 1コミット1目的を守る
- コミット前に差分を確認する
- コミットメッセージは日本語で記述する
- `prefix` は「変更の主目的」で決める
- 迷う場合の優先順位は `fix > add > refactor > chore`

## コミット分割の判断

**prefix が変わるなら分割する。**

「テストと実装」「バグ修正とリファクタ」「関係ない2つのバグ」は prefix が異なる → 別コミット。
付随変更（型定義・import・設定ファイル）は実装と一緒でよい。

分割が必要かどうか迷ったら、「1つの目的を1文で言えるか」を確認する。言えなければ分割する。後から分割するより、作業の区切りで都度コミットする方が確実。

## メッセージ形式

```text
<prefix>: <summary>

<detail>
- <file path 1>
- <file path 2>
```

- `summary` は 30〜60 文字目安
- `detail` は 1〜3 行で要点のみ記載
- 修正ファイル名は本文に含めてよい（簡潔に列挙）

例:

```text
add: セット入力画面に前回記録のインライン表示を追加

前回ワークアウトのセット数・重量をグレーで表示し、入力補助とする。
- apps/mobile/src/screens/WorkoutScreen.tsx
- apps/mobile/src/components/SetRow.tsx
```

```text
fix: ワークアウト保存時に空セットが登録される不具合を修正

セット追加前のバリデーション漏れを修正。
- apps/mobile/src/stores/workoutStore.ts
```

```text
docs: ワークフロー表に各コマンドの成果物列を追加

READMEの手順を最新構成に合わせて整理。
- README.md
```

## 実行フロー

1. 変更確認

```bash
git status --short
git diff
```

2. 分割判断: 「1つの目的を1文で言えるか」確認。複数目的が混在していたらコミットを分割する

3. 変更の主目的を1文で定義
   - 「何を直した/追加したか」ではなく「なぜ必要か」を明確化

4. prefix判定
   - 判定表に従い最も影響の大きい変更を採用

5. ステージング整理

```bash
# ファイル単位で分ける場合
git add <file1> <file2>

# 同一ファイル内でも論理的に分けたい場合（ハンク選択）
git add -p <file>
```

> **⚠️ 一括フォーマット後の git add に注意**
>
> `prettier --write` や `eslint --fix` 実行後、`git add` するときは
> 未トラックのファイルを誤って混入させないよう以下を確認する:
>
> ```bash
> # 1. 実際に変更されたファイルだけ確認（未トラックは ? で表示される）
> git status --short
>
> # 2. ステージ後も内容を確認してからコミット
> git diff --stat --cached
> ```
>
> **失敗パターン**: `prettier --write` で "(unchanged)" だったファイルでも、
> 未トラック状態のファイルを明示的に `git add <path>` で指定すると
> 新規ファイルとして誤コミットされる。
> `renderHook` を `.test.ts`（logic project）で動かしてしまうなど、
> ファイル拡張子を間違えたファイルを誤コミットすると CI テストが落ちる原因になる。

6. コミット実行

```bash
git commit -m "<prefix>: <summary>" -m "<detail>\n- <file path>"
```

7. 次のコミットがあれば 5→6 を繰り返す

## prefix判定ルール（実務用）

- バグを直しているなら `fix`（新規機能を含んでも原則 `fix`）
- 新しい振る舞いを導入するなら `add`
- 外部仕様に影響せず内部構造のみ整理なら `refactor`
- テストだけなら `test`
- ドキュメントだけなら `docs`
- CI定義だけなら `ci`
- 依存解決・ビルド定義中心なら `build`
- 速度改善が主目的なら `perf`
- どれにも当てはまらない保守作業は `chore`

## subject の書き方

- **小文字始まり**（commitlint の `subject-case` ルールに従う）
- 英語の固有名詞（GitHub, TypeScript 等）を subject の先頭に置かない

```text
// NG: PascalCase 始まりで commitlint に弾かれる
ci: GitHub Actions CI をセットアップ

// OK: 小文字始まり
ci: github actions ci をセットアップ
```

## NG例

- `update`, `misc`, `changes` のような曖昧なsummary
- 無関係な変更を1コミットに混在
- `fix` なのに本文が「機能追加」中心
- 巨大コミットを分割せずにそのまま記録
- 詳細が長すぎて差分を読まないと要点が分からない本文
- ステアリングファイルの変更をコミットに含める（ステアリングファイルは常に別コミットで管理）
- 対応と関係ないファイルをコミットに含める（例: 変更と関係ないテストファイルの変更を含める）

## 実行前チェックリスト

- 差分を確認した
- prefixの根拠を説明できる
- 1コミット1目的になっている（複数目的なら分割した）
- summary と detail が重複せず簡潔
- 本文に主要な修正ファイル名を記載した
- テストまたは最低限の動作確認を実施した
- コンテキストウィンドウと無関係な変更を含めていない

## クイックコマンド

このスキルを呼び出すコマンドprefixは以下を推奨:

```text
/git-commit
```

実行例:

```text
/git-commit 「変更差分を見て適切なprefixでコミットして」
```
