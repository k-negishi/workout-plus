# 機能仕様：ヘッダーのトンマナ統一

**Issue**: #168
**作成日**: 2026-02-26
**方針**: 案B（RecordScreen は青ヘッダーを維持、その他を統一）

---

## 背景・目的

アプリ内のカスタムヘッダーに以下の不整合が存在する：

| 画面 | 不整合内容 |
|---|---|
| RecordScreen | fontSize 16（他は 17） |
| AIScreen | タイトル左揃え（他は中央揃え）、fontSize 18、color #475569 |

RecordScreen の青ヘッダーは「記録中モード」を示す意図的な UX 設計として維持する。
その他の数値的な不整合を修正してトンマナを統一する。

---

## ヘッダー統一仕様（案B）

### 標準ヘッダー仕様（ナビゲーション画面）

| 項目 | 値 |
|---|---|
| 背景色 | `#FFFFFF` |
| タイトル位置 | 中央揃え（`textAlign: 'center'`） |
| タイトル fontSize | `17` |
| タイトル fontWeight | `'600'` |
| タイトル color | `#334155` |
| paddingHorizontal | `16` |
| paddingBottom | `12` |
| 下ボーダー | `borderBottomWidth: 1, borderBottomColor: '#e2e8f0'` |
| 左: 戻るボタン | `Ionicons chevron-back, size 24, color #475569` |
| 右: スペーサー or アクションボタン | `width: 40` |

### RecordScreen 専用ヘッダー仕様（タスク実行中）

| 項目 | 値 |
|---|---|
| 背景色 | `#4D94FF`（維持） |
| タイトル位置 | 中央揃え（維持） |
| タイトル fontSize | `17`（16 → **17 に修正**） |
| タイトル fontWeight | `'600'`（維持） |
| タイトル color | `#ffffff`（維持） |

### AIScreen ヘッダー仕様（タブルート画面）

| 項目 | 値 |
|---|---|
| 背景色 | `#FFFFFF`（維持） |
| タイトル位置 | 中央揃え（左揃え → **中央揃えに修正**） |
| タイトル fontSize | `17`（18 → **17 に修正**） |
| タイトル fontWeight | `'600'`（維持） |
| タイトル color | `#334155`（#475569 → **#334155 に修正**） |
| paddingHorizontal | `16`（20 → **16 に修正**） |
| 下ボーダー | 維持（`borderBottomWidth: 1`） |

---

## 変更スコープ

変更ファイル：
1. `apps/mobile/src/app/screens/AIScreen.tsx`
2. `apps/mobile/src/features/workout/screens/RecordScreen.tsx`

非変更ファイル（既に統一済み）：
- `ExercisePickerScreen.tsx`
- `WorkoutSummaryScreen.tsx`
- `ExerciseHistoryFullScreen.tsx`

---

## ユーザーストーリー

**US-1**: ユーザーとして、AIScreen のヘッダーが他の画面と同じ視覚スタイルで表示されることを期待する。
**US-2**: ユーザーとして、RecordScreen の記録中ヘッダーは青で区別されつつ、フォントサイズが統一されていることを期待する。

---

## 受け入れ条件

- [ ] AIScreen のヘッダータイトルが中央揃えで表示される
- [ ] AIScreen のヘッダータイトルが fontSize 17 で表示される
- [ ] AIScreen のヘッダータイトルが color #334155 で表示される
- [ ] RecordScreen のヘッダータイトルが fontSize 17 で表示される
- [ ] RecordScreen の背景色 #4D94FF が維持される
- [ ] 既存テストが全て PASS する
