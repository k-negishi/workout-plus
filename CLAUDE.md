# 開発ワークフロー

当面の間、 main ブランチで作業すること
当面の間、ワイヤーフレーム/WF を参照する際は、/Users/Kei/Development/projects/workout-plus/requirements/adopted/workout_plus_wireframes_v5_md3.html を参照すること

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

### ワンショット実行

```bash
/speckit.yolo <機能説明>
```

`specify → plan → tasks → implement` を確認待ちなしで連続実行（`clarify` と `taskstoissues` は省略）。

## 品質チェック

| コマンド | 内容 |
|---|---|
| `/speckit.analyze` | spec・plan・tasks の横断的な整合性チェック（非破壊） |
| `/speckit.checklist` | 機能に合わせたカスタムチェックリストを生成 |

## よく使う開発コマンド

```bash
pnpm --filter mobile start       # Expo Go 起動
pnpm --filter mobile ios         # iOS シミュレーター（--localhost 固定済み。LAN IP だとタイムアウトするため）
pnpm lint                        # 全パッケージ Lint（turbo 経由）
pnpm --filter mobile test        # テスト実行
pnpm --filter mobile test --coverage  # カバレッジ付き（目標 90%+）
pnpm --filter mobile tsc --noEmit    # 型チェック

# API サーバー
pnpm --filter @workout-plus/api dev           # ローカルサーバー起動（http://localhost:3000）
pnpm --filter @workout-plus/api lint          # Lint
pnpm --filter @workout-plus/api format:check  # フォーマットチェック
pnpm --filter @workout-plus/api test          # テスト
pnpm --filter @workout-plus/api typecheck     # 型チェック
```

---

# 基本方針
- 特に指示がない場合、Agent Team でエージェントを5つ立ち上げてください。
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

## Active Technologies
- TypeScript 5.x / React Native 0.81.5 (Expo SDK 52) + @react-navigation/bottom-tabs v7, NativeWind v4, react-native-calendars, expo-sqlite ~15.2.0, react-native-svg (003-wireframe-ui-fix)
- SQLite via expo-sqlite（migration pattern で version 管理） (003-wireframe-ui-fix)
- TypeScript 5.x / React Native 0.81.5 (Expo SDK 52) + expo-sqlite ~15.2.0, React Navigation v7, NativeWind v4, Zustand (workoutSessionStore) (004-timer-stop-confirm)
- SQLite via expo-sqlite（migration pattern） (004-timer-stop-confirm)
- TypeScript 5.x / React Native 0.81.5 / React 19.1.0 + Expo SDK 54, React Navigation v7, @testing-library/react-native, Jest 29 (005-fix-plus-button-wf)
- N/A（UI修正のみ） (005-fix-plus-button-wf)
- TypeScript 5.x / React Native 0.81.5 (Expo SDK 52) + Zustand, expo-sqlite ~15.2.0, React Navigation v7, NativeWind v4, @testing-library/react-native, Jest 29 (20260222-当日ワークアウト継続登録)
- SQLite via expo-sqlite（既存スキーマ変更なし、リポジトリメソッド追加のみ） (20260222-当日ワークアウト継続登録)
- TypeScript 5.x + React Native 0.81.5 (Expo SDK 52), `@expo/vector-icons` (Ionicons, 既存導入済み), `react-native-safe-area-context` (20260222-ホーム画面タイトルヘッダー追加)
- N/A（UIのみ） (20260222-ホーム画面タイトルヘッダー追加)
- TypeScript 5.x + React Native 0.81.5 (Expo SDK 52), Zustand, expo-sqlite ~15.2.0, @testing-library/react-native, Jest 29 (20260223-種目選択ソート)
- SQLite（既存スキーマ変更なし。`workout_exercises` テーブルをJOINして使用回数集計） (20260223-種目選択ソート)

## Recent Changes
- 003-wireframe-ui-fix: Added TypeScript 5.x / React Native 0.81.5 (Expo SDK 52) + @react-navigation/bottom-tabs v7, NativeWind v4, react-native-calendars, expo-sqlite ~15.2.0, react-native-svg
