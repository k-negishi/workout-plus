---
name: workout-design
description: workout-plus プロジェクト固有のデザイン方針・決定事項を管理するスキル
allowed-tools: Read, Write, Edit
---

# workout-design スキル

workout-plus プロジェクト固有のデザイン方針・決定事項を管理するスキル。

> **B案（常時 Read）**: スキル開始時に必ず以下を Read してデザイントークンを参照する:
> `Read .claude/skills/workout-design/design-tokens.md`

---

## ユーザーのデザイン嗜好

### 基本原則
- **引き算のデザイン**を好む。「足す」より「削る」方向で提案すべき
- 過剰な装飾・情報量は避け、**実用性とクリーンさ**を最優先にする
- 「AIっぽい」デザイン（過剰なグラデーション、多すぎるシャドウ、不統一なborder-radius）を嫌う
- デザイン候補を出す際は、**軽い方向から順に提案**する（ミニマル→標準→リッチの順）
- 「盛る」提案は最小限に。ユーザーが求めたら出す程度で良い

### デザイン選定の振り返り
- 6つのサービス風デザインから**ClickUp**を選択。ダッシュボード性とデータ重視がワークアウトアプリに合っている
- ヘッダーは v1（シンプルフラット）→ **v1_light（軽量化）**を採用
- v1でもまだ「圧がある」と指摘された。ユーザーが一貫して「軽さ・シンプルさ」を求めていたのに、グラデーションやスプリットなど重い方向の案も出してしまった
- 早い段階でv1_light相当の「明るい背景」案を含めるべきだった

---

## デザイントークン（カラー・CSS ガイドライン）

> **B案（常時 Read）**: `Read .claude/skills/workout-design/design-tokens.md`
> カラーパレット（#4D94FF 等）・CSS ガイドライン（border-radius/font-weight/padding の値一覧）・フォントが収録されている。

---

## アイコン使用ガイドライン（Ionicons）

> **A案（アイコン追加・変更時のみ Read）**: `Read .claude/skills/workout-design/ionicons-guide.md`
> Ionicons アイコン対応表・テストモックパターンが収録されている。

---

## 採用済みパターン

- ホーム画面: ClickUp風 + v1_light（軽量ヘッダー）
- 種目選択: フルスクリーンモーダル（1種目選択）
- 種目別履歴: ボトムシート（70%高さ）→ フルスクリーン展開
- セット入力: 各セット行の上にインラインで前回記録をグレー表示（候補A方式）
- デフォルトセット数: 前回ワークアウトのセット数に合わせる

---

## グラフ（LineChart）のデザイン方針

### ツールチップ

- **縦線（pointerStrip）は表示しない** → `showPointerStrip: false`
  - タップしたデータポイントの上にツールチップを浮かせるだけで十分。縦線は「引き算デザイン」に反する
- ツールチップスタイル: 白背景 + ボーダー線（`colors.border`）、シャドウなし
- 値（重量）を大きく表示し、週ラベルを小さく配置（情報の優先度を明確化）
- `pointerVanishDelay: 150`（指を離してからの消える速度）が体感的に適切

### `pointerConfig` 基本セット（`react-native-gifted-charts` LineChart）

```typescript
pointerConfig={{
  showPointerStrip: false,               // 縦線は不要
  radius: 5,
  pointer1Color: colors.primary,
  pointerLabelComponent: renderTooltip,
  pointerLabelWidth: 80,
  pointerLabelHeight: 50,
  autoAdjustPointerLabelPosition: true,  // 画面端はみ出し防止
  activatePointersInstantlyOnTouch: true,
  activatePointersOnLongPress: false,    // ScrollView との競合を回避
  persistPointer: false,
  pointerVanishDelay: 150,
}}
```

---

## チップ選択肢のレイアウト

### flexWrap は使わない（最終行孤立問題が発生する）

`flexWrap: 'wrap'` のままではテキスト長に依存して最終行に1個だけ残ることがある。
要素数を増やして偶数にしようとしても、増やした要素が全部1行に収まってしまい改善にならないケースがある。

### useWindowDimensions + 均等幅計算グリッドを使う

```typescript
import { useWindowDimensions } from 'react-native';

// コンポーネント内（フックなので関数本体内で呼ぶ）
const { width } = useWindowDimensions();
const CHIP_COLUMNS = 4;
const CONTAINER_PADDING = containerPaddingHorizontal * 2;  // 例: 20 * 2 = 40
const CHIP_GAP = gap * (CHIP_COLUMNS - 1);                 // 例: 6 * 3 = 18
const chipWidth = (width - CONTAINER_PADDING - CHIP_GAP) / CHIP_COLUMNS;

// 各チップに適用
<TouchableOpacity style={[styles.chip, { width: chipWidth, alignItems: 'center' }]} />
```

### チップ数と列数の選び方

| チップ数 | 推奨列数 | 結果 |
|---|---|---|
| 8個 | 4列 | 4+4（均等） |
| 6個 | 4列 | 4+2 |
| 6個 | 3列 | 3+3（均等） |
| 5個 | 4列 | 4+1（孤立） → 3列推奨 |

### 実績

- `ExerciseHistoryFullScreen.tsx` の `ExerciseEditForm`（部位8個 → 4列4+4、器具6個 → 4列4+2）
- `containerPaddingHorizontal=20`、`gap=6`、`columns=4`

---

## 統計サマリーカード（StatCard）

> **A案（StatCard 作業時のみ Read）**: `Read .claude/skills/workout-design/stat-card.md`
> StatCard のレイアウト・テキストオーバーフロー対策・ラベル命名ルールが収録されている。
