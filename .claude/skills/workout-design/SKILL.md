---
name: workout-design
description: workout-plus プロジェクト固有のデザイン方針・決定事項を管理するスキル
allowed-tools: Read, Write, Edit
---

# workout-design スキル

workout-plus プロジェクト固有のデザイン方針・決定事項を管理するスキル。

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

## CSS ガイドライン

- border-radius: 3種類まで（6px, 8px, 12px）
- font-weight: 3種類（400, 600, 700）
- padding: 4pxの倍数
- グラデーション禁止（ベタ塗り）
- シャドウ最小限（境界線を使う）

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

## アイコン使用ガイドライン

### 基本方針: 絵文字・テキスト記号は使わない

絵文字（📊 🗑 ✎）やUnicode記号はOS・フォントによって見た目が変わる。
**`@expo/vector-icons` の `Ionicons` を必ず使うこと。**

```tsx
// NG: 絵文字・テキスト記号
<Text>{'✎'}</Text>
<Text>{'🗑'}</Text>
<Text>{'📊'}</Text>

// OK: Ionicons
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="create-outline" size={22} color="#475569" />
<Ionicons name="trash-outline" size={22} color="#EF4444" />
<Ionicons name="stats-chart-outline" size={22} color="#4D94FF" />
```

### ワークアウトアプリの推奨アイコン対応表

| 用途 | Ionicons name | サイズ | カラー |
|---|---|---|---|
| 戻るボタン | `chevron-back` | 24 | #475569 |
| 編集 | `create-outline` | 22 | #475569 |
| 削除 | `trash-outline` | 22 | #EF4444 |
| 履歴・統計 | `stats-chart-outline` | 22 | #4D94FF |
| お気に入り（未登録） | `heart-outline` | 22 | #64748b |
| お気に入り（登録済み） | `heart` | 22 | #EF4444 |
| 検索 | `search-outline` | 20 | #64748b |
| 並び替え | `reorder-three-outline` | 22 | #475569 |
| 追加・新規 | `add` | 24 | #ffffff（FAB内） |
| 閉じる | `close` | 24 | #475569 |

### テストでの Ionicons モック

テスト環境では `@expo/vector-icons` をモックして testID / accessibilityLabel を通す:

```typescript
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    const C = (props: Record<string, unknown>) =>
      React.createElement(name, {
        testID: props['testID'],
        accessibilityLabel: props['accessibilityLabel'],
      });
    C.displayName = name;
    return C;
  };
  return { __esModule: true, Ionicons: mockIcon('Ionicons') };
});
```

## 採用済みパターン

- ホーム画面: ClickUp風 + v1_light（軽量ヘッダー）
- 種目選択: フルスクリーンモーダル（1種目選択）
- 種目別履歴: ボトムシート（70%高さ）→ フルスクリーン展開
- セット入力: 各セット行の上にインラインで前回記録をグレー表示（候補A方式）
- デフォルトセット数: 前回ワークアウトのセット数に合わせる
