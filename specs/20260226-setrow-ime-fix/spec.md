# 仕様書: SetRow iOS 日本語入力 IME 修正

**Issue:** #165
**Feature Dir:** `specs/20260226-setrow-ime-fix/`
**作成日:** 2026-02-26

---

## 概要

登録画面（RecordScreen）のセット行（SetRow）で、iOS 日本語入力（IME）使用時に以下の問題が発生している。

| 症状 | 再現条件 |
|---|---|
| 数値が入力できない | iOS で日本語キーボードを選択した状態で重量/レップ欄をタップ |
| ちらつく | 日本語 IME の変換確定前に値が消える/リセットされる |
| シミュレーターで削除できない | iOS シミュレーター + 日本語キーボードでバックスペースが効かない |

---

## 根本原因

`SetRow.tsx` が controlled TextInput（`value` prop による制御）を採用しており、`onChangeText` → 親 state 更新 → re-render → `value` 再設定 というサイクルが、iOS の IME marked text（変換中フレーズ）を上書きする。

```
onChangeText → onWeightChange → Zustand store 更新
              → RecordScreen re-render
              → SetRow に新しい value prop
              → TextInput の IME 内部状態リセット ← 問題
```

---

## ユーザーストーリー

### US-1: 日本語入力環境での数値入力
**As** トレーニーユーザー（iOS 日本語キーボード使用者）
**I want** 登録画面で重量・レップ数を正常に入力できること
**So that** 記録を正確に登録できる

### US-2: シミュレーターでの数値削除
**As** 開発者（iOS シミュレーターでのテスト）
**I want** シミュレーター上でも数値の削除ができること
**So that** 開発・テストフローが妨げられない

---

## 機能要件

### FR-1: ローカルテキストバッファ
- SetRow は重量・レップ入力用のローカル state（`weightText`, `repsText`）を持つ
- `value` prop は親の `set.weight`/`set.reps` でなく、ローカル state を参照する
- IME 変換中に親の re-render が発生しても TextInput の表示値がリセットされない

### FR-2: 数値フィルタリング
- `onChangeText` で数値以外の文字（日本語 IME が混入させた文字）を自動除去する
  - 重量（decimal）: `/[^0-9.]/g` で除去 + 小数点の重複を防ぐ
  - レップ（integer）: `/[^0-9]/g` で除去
- フィルタリング後の有効な数値のみ親コールバックへ通知する

### FR-3: onBlur での正規化
- フォーカスを外したとき（`onBlur`）、ローカル state を親の値に同期する
- 例: ユーザーが "6" まで入力して別の場所をタップした場合、`set.weight` の値に表示が戻る
- 例外: 親の値が `null` の場合は空文字にリセットする

---

## 非機能要件

- 既存テストがすべて PASS すること
- 新規テストでフィルタリングと onBlur 正規化を検証すること
- 変更は `SetRow.tsx` と `SetRow.test.tsx` のみ（影響範囲最小化）

---

## 対象外

- `NumericInput.tsx`（SetRow では使用されていない）
- `ChatInput.tsx`（日本語テキスト入力であり数値入力ではない。IME 問題発生時に別途対応）
- iOS キーボードタイプ設定（`keyboardType="decimal-pad"` を日本語 IME が無視するのは iOS の仕様）

---

## 受け入れ基準

| # | 条件 |
|---|---|
| AC-1 | 日本語キーボードで「1」「0」と入力したとき、`onWeightChange` が `(setId, 10)` で呼ばれる |
| AC-2 | 日本語文字（例: 「あ」）が混入しても数値部分だけが親に通知される |
| AC-3 | フォーカスを外すとローカル state が親の値に正規化される |
| AC-4 | `pnpm --filter mobile test` が全件 PASS |
| AC-5 | `pnpm lint` が PASS |
