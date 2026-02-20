# Workout+ Design System

## 概要

Workout+のデザインシステムは、GitHubの[Primer Design System](https://primer.style/)の構造・命名規則を参照して構築されています。

## 参照元リポジトリ

| リポジトリ | バージョン | 用途 |
|---|---|---|
| [@primer/primitives](https://github.com/primer/primitives) | 11.4.0 | トークン命名規則・階層構造 |
| [@primer/css](https://github.com/primer/css) | latest | CSSアーキテクチャパターン |

## 採用方針

### なぜPrimerを参照するか

1. **成熟した命名規則**: `--fgColor-default`, `--bgColor-muted` のようなセマンティックトークンは意味が明確で保守性が高い
2. **2層構造**: Base Tokens（プリミティブ値）→ Semantic Tokens（用途別）の分離が将来のテーマ切り替えに対応しやすい
3. **実績**: GitHub本番環境で採用されており、スケーラビリティが実証済み

### Workout+固有のカスタマイズ

Primerの命名規則を踏襲しつつ、Workout+のカラーパレットを適用:

- **メインカラー**: `#4D94FF`（Primerの `--color-accent-fg` に相当）
- **テキスト**: `#475569` / `#64748b`（真っ黒を避けた濃いグレー）
- **フォント**: Noto Sans JP を先頭に配置（日本語UI対応）

### border-radiusの統一方針

| トークン | 値 | 用途 |
|---|---|---|
| `--borderRadius-small` | 4px | 最小要素（タグ等） |
| `--borderRadius-medium` | 6px | 入力フォーム、バッジ（旧8pxを統一） |
| `--borderRadius-large` | 12px | カード、モーダル |
| `--borderRadius-full` | 624.9375rem | 円形ボタン |

> phoneフレームの `border-radius: 44px` は例外的にそのまま使用（UIコンテンツではなくデバイス形状のため）

## ファイル構成

```
requirements/design-system/
├── tokens.css        # デザイントークン定義（本ファイルから参照）
└── README.md         # 本ファイル（採用方針・参照元記録）

/tmp/primer-migration/
├── agent1-base.css          # ベースCSS（トークン参照）
├── agent1-base-outer.html   # Phone Frameの外側HTML構造
├── agent1-base-tabbar.html  # Tab Bar HTML
├── agent2-*.css             # 各画面スタイル（他エージェント担当）
└── ...
```

## 使用方法

HTMLの `<head>` 内で以下の順番でインポート:

```html
<!-- 1. デザイントークン -->
<link rel="stylesheet" href="tokens.css">
<!-- 2. ベースCSS -->
<link rel="stylesheet" href="agent1-base.css">
<!-- 3. 各画面CSS（必要に応じて） -->
<link rel="stylesheet" href="agent2-history.css">
```
