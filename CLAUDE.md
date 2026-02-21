# 開発ワークフロー

## 仕様策定 → 実装の標準フロー

```
specify → clarify → plan → tasks → [taskstoissues] → implement
```

| ステップ | コマンド | 内容 |
|---|---|---|
| 1. 仕様書作成 | `/speckit.specify` | `specs/<feature>/` ディレクトリと仕様書を生成 |
| 2. 仕様の明確化 | `/speckit.clarify` | 未定義領域を最大5問で質問・仕様に反映 |
| 3. 実装計画 | `/speckit.plan` | `plan.md` を生成（アーキテクチャ・依存関係） |
| 4. タスク生成 | `/speckit.tasks` | `tasks.md` を生成（依存関係順・並列可否付き） |
| 5. Issue化 | `/speckit.taskstoissues` | tasks.md を GitHub Issues に変換 |
| 6. 実装 | `/speckit.implement` | tasks.md の全タスクを順次・並列実行 |

## 品質チェック

| コマンド | 内容 |
|---|---|
| `/speckit.analyze` | spec・plan・tasks の横断的な整合性チェック（非破壊） |
| `/speckit.checklist` | 機能に合わせたカスタムチェックリストを生成 |

## よく使う開発コマンド

```bash
pnpm --filter mobile start       # Expo Go 起動
pnpm --filter mobile ios         # iOS シミュレーター
pnpm lint                        # 全パッケージ Lint
pnpm --filter mobile test        # テスト実行
pnpm --filter mobile test --coverage  # カバレッジ付き（目標 90%+）
pnpm --filter mobile tsc --noEmit    # 型チェック
```

---

# 基本方針
- 特に指示がない場合、Agent Team を 5つ立ち上げてください。
- 指示がない限りは sonnet 4.6 を使ってください
- ソースコードには日本語でコメントを書くこと

# 実装ルール（必須）
- **機能追加・バグ修正の実装コードを書く前に、必ず `/test-driven-development` スキルを実行すること**
- テストなしでプロダクションコードを書いてはならない（例外は人間のパートナーの許可がある場合のみ）

# Expo Go の重要な制約
- Expo Go はネイティブコードをバンドル済み。`package.json` を変更しても JS 側しか変わらない
- ネイティブモジュールのバージョンは **`^`（caret）禁止** → `~`（tilde）か厳密固定で SDK bundledNativeModules と一致させる
- `npx expo install --fix` で互換バージョンを確認できる
- Hermes エンジンには `crypto.getRandomValues` がない → `src/polyfill.ts` で補完済み

# デザイン方針
- 詳細は `.claude/skills/workout-design/SKILL.md` を参照
- 引き算のデザイン、実用性とクリーンさ最優先
- メインカラー: #4D94FF（#0066FFは濃すぎるため廃止）
- 黒文字は真っ黒を避け #475569（濃いグレー）で
- 