# 仕様書: 前回セット表示をインラインチップ形式に改善する（Issue #138）

## 概要

登録画面（ExerciseBlock）の前回記録表示を、現在の「前回: 3セット (2/8)」バッジから、
実際のセット内容が一目でわかるインラインチップ形式に変更する。

## 背景・問題

「前回: 3セット (2/8)」バッジでは日付とセット数しかわからず、実際に何kg何回やったかが確認できない。
ワークアウト中にその場で前回値を確認したい（いちいちバッジをタップして確認する手間をなくす）。

## ユーザーストーリー

- ユーザーとして、前回の各セットの重量と回数をその場で確認できるので、今日のセットの目標設定がしやすい

## 機能要件

### FR-1: インラインチップ表示
- 前回記録が存在する場合、種目ヘッダー下に前回セット内容を常時表示する
- 表示形式: `前回 M/d  ① kg×reps  ② kg×reps  ...`
- 折り返しあり（`flexWrap: 'wrap'`）で、セット数が多くても対応
- 重量または回数が未入力の場合は `-` で表示

### FR-2: 部位ラベル削除
- 種目名下の部位テキスト（「胸」「背中」等）を削除する

### FR-3: コピーボタン削除
- 「前回の全セットをコピー」バッジボタンを削除する
- 関連する `onCopyAllPrevious` prop および RecordScreen の `handleCopyAllPrevious`、`onCopyPreviousSet` も削除する

### FR-4: 前回記録なしの場合
- `previousRecord` が null の場合、チップ行は非表示

## 非機能要件

### NFR-1: スタイル（控えめ）
- `fontSize: 12`
- `color: '#94a3b8'`（薄いグレー）
- 括弧・囲みbox・区切り線なし
- `marginBottom: 6` 程度の余白（セット列との間隔）

### NFR-2: 後方互換性
- `showPreviousRecord` prop は RecordScreen レベルで `previousRecord={null}` を渡すことで制御済みのため、ExerciseBlock 側からは削除する

## 画面仕様

```
ダンベルベンチプレス                          ×

  前回 2/8  ① 20×10  ② 26×8  ③ 30×6  ④ 30×6
            ⑤ 28×5   ⑥ 26×5  ⑦ 24×8  ⑧ 22×10

Set    kg        rep    1RM
1    [   ]  ×  [   ]   -
```

## 対象ファイル

| ファイル | 変更種別 |
|---------|---------|
| `apps/mobile/src/features/workout/components/ExerciseBlock.tsx` | 修正 |
| `apps/mobile/src/features/workout/components/__tests__/ExerciseBlock.test.tsx` | 修正 |
| `apps/mobile/src/features/workout/screens/RecordScreen.tsx` | 修正（prop 削除） |

## 変更しないもの

- `usePreviousRecord` フック（変更不要）
- SetRow コンポーネント（変更不要）
- RecordScreen の `showPreviousRecord` ロジック（`previousRecord={null}` 渡しで対応済み）
