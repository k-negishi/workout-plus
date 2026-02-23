# 種目選択画面 FAB（Floating Action Button）化

## Issue
#136

## 概要
種目選択画面（ExercisePickerScreen）の「カスタム種目を追加」ボタンを、リスト末尾の静的ボタンから画面右下固定の FAB（Floating Action Button）に変更する。

## 現状
- `ListFooterComponent` 内に `+ カスタム種目を追加` ボタンが配置されている
- ユーザーがリスト最下部までスクロールしないとボタンが見えない
- ボタンをタップすると `isCreating` が true になり、インラインでカスタム種目作成フォームが展開される

## 変更内容

### 1. FAB の追加
- 画面右下に固定表示する FAB を追加
- FAB は `+` アイコン（Ionicons の `add`）を表示
- 背景色: `#4D94FF`（メインカラー）
- サイズ: 56x56px、borderRadius: 28
- シャドウ: 最小限（shadowOpacity: 0.15, elevation: 4）
- アクセシビリティ: `accessibilityLabel="カスタム種目を追加"`, `accessibilityRole="button"`

### 2. 既存ボタンの削除
- `ListFooterComponent` 内の `+ カスタム種目を追加` ボタン（非フォーム時の TouchableOpacity）を削除
- FAB タップ時に `isCreating` を true にして同じフォームを表示する

### 3. カスタム種目作成フォームの維持
- `isCreating` が true の場合のフォーム表示ロジックは変更なし
- フォーム自体は引き続き `ListFooterComponent` 内に表示する
- FAB はフォーム表示中も表示するが、フォーム表示中は非表示にする（二重トリガー防止）

### 4. multi モードとの共存
- multi モード時のフッター（一括追加ボタン）と FAB が重ならないよう配慮
- multi モード時は FAB の bottom を調整（フッター高さ分上げる）

## 影響範囲
- `ExercisePickerScreen.tsx`: FAB 追加、既存ボタン削除
- `ExercisePickerScreen.test.tsx`: FAB のテスト追加

## 非対応
- フォームの表示場所変更（モーダル化など）は本 Issue のスコープ外
