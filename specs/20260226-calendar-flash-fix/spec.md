# カレンダー初期表示フラッシュ修正

## Issue

[#171](https://github.com/k-negishi/workout-plus/issues/171) - カレンダーを開くと、一瞬大きなカレンダーが表示されて、その後縮小されて所定のサイズに収まる。縮小の動きをなくしたい

## 問題の原因

`MonthCalendar.tsx` の `containerWidth` 初期値が `Dimensions.get('window').width`（デバイス全幅）で設定されているが、親の `CalendarScreen` は `px-5`（paddingHorizontal: 20px）を適用しているため、実効幅は `window.width - 40` になる。

### フラッシュのタイムライン

1. **初期描画（0ms）**: `containerWidth = Dimensions.get('window').width`（例: 393px）
2. **onLayout 発火（1-5ms）**: 実測幅 353px（= 393 - 40）で `setContainerWidth(353)`
3. **リレンダー**: 3パネルが 393px → 353px に縮小 → **ユーザーにフラッシュとして見える**

## 修正方針

`onLayout` で実測幅を取得するまでカレンダー全体を `opacity: 0` で非表示にする。

- `isLayoutMeasured` フラグを追加
- `handleLayout` で幅計測完了後に `true` に設定
- `opacity: isLayoutMeasured ? 1 : 0` でフラッシュを完全に防止

### なぜこのアプローチか

| 対策 | 効果 | 実装難度 | 副作用 | 推奨度 |
|-----|------|---------|--------|-------|
| **A. opacity で遅延表示** | 高 | 低 | なし（要素はツリーに存在） | ★★★★★ |
| B. 初期値を `-40` で補正 | 中 | 低 | 親のパディング変更時に同期必要 | ★★★☆☆ |
| C. 条件付きレンダリング | 高 | 中 | ScrollView の再マウントでちらつき | ★★☆☆☆ |

## 受入条件

- [ ] カレンダー画面を開いた際にフラッシュ（サイズ変動）が発生しない
- [ ] 月切替（矢印・スワイプ）が正常に動作する
- [ ] 既存テストがすべてパスする
- [ ] 新規テスト: `isLayoutMeasured` の動作を検証

## 影響範囲

- `MonthCalendar.tsx`: opacity 制御の追加（2行追加 + 1行変更）
- テスト: `MonthCalendar.component.test.tsx` に onLayout テスト追加
