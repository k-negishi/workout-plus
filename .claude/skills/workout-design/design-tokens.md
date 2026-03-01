# デザイントークン

workout-plus プロジェクトの CSS ガイドライン・カラーパレット・タイポグラフィ。
このファイルは workout-design スキルの参照ファイルです（B案: スキル開始時に常時 Read）。

---

## CSS ガイドライン

- border-radius: 3種類まで（6px, 8px, 12px）
- font-weight: 3種類（400, 600, 700）
- padding: 4pxの倍数
- グラデーション禁止（ベタ塗り）
- シャドウ最小限（境界線を使う）

---

## カラーパレット（v1_light 準拠）

### プライマリ（青）
- --color-primary: **#4D94FF**（メインカラー。ボタン、リンク、アクティブ状態）
- --color-primary-dark: **#3385FF**（ホバー、ヘッダーテキスト）
- --color-primary-bg: **#E6F2FF**（ヘッダー背景、ハイライト背景）
- --color-primary-subtle: **rgba(0, 102, 255, 0.08)**（カード背景のアクセント）
- ~~#0066FF は廃止~~（濃すぎるため不採用）

### 成功・完了
- --color-success: **#10B981**（完了ボタン、セット完了、PRバッジ）
- --color-success-bg: **#F0FDF4**（完了セットの背景）

### テキスト
- --text-primary: **#475569**（見出し、本文）
- --text-secondary: **#64748b**（補助テキスト、メタ情報）
- --text-heading: **#334155**（大見出し）
- ~~#000000, #1A1A1A は廃止~~（真っ黒は使わない）

### 背景・ボーダー
- --bg-page: **#f9fafb**（ページ背景）
- --bg-card: **#ffffff**（カード背景）
- --bg-input: **#FAFBFC**（入力フィールド背景）
- --bg-separator: **#F1F3F5**（種目ブロック間の区切り）
- --border-color: **#e2e8f0**（カード・入力フィールドのボーダー）

### フォント
- Noto Sans JP（weight: 400, 600, 700）
