# Data Model: +ボタンをワイヤーフレーム準拠に修正

本対応は永続化データモデルの変更を伴わない。

## UI Contract Entities

### RecordTabButtonVisual
- role: タブバー中央の主アクションボタン
- required attributes:
  - size: `56x56`
  - shape: `circle`
  - background: `primary (#4D94FF)`
  - border: `4px` / `background color`
  - shadow: `0 4 16 rgba(77,148,255,0.4)` 相当
  - glyph: center aligned `+`

### RecordTabButtonInteraction
- trigger: ユーザーが中央+ボタンを押下
- effect: `RecordStack` への遷移イベントを発火
- failure mode: なし（押下できない/見切れる状態を許容しない）
