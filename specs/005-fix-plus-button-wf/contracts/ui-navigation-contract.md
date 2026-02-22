# UI Navigation Contract: MainTabs Center Action

## View Contract

| Field | Requirement |
|---|---|
| testID | `record-tab-button` |
| width/height | `56` / `56` |
| borderRadius | `28` |
| backgroundColor | `colors.primary` |
| border | `4px` / `colors.background` |
| shadow | `shadowColor=colors.primary`, `shadowOffset=(0,4)`, `shadowRadius=16`, `shadowOpacity=0.4` |
| glyph | 中央に `+` 表示 |

## Interaction Contract

| Action | Expected Behavior |
|---|---|
| tap `record-tab-button` | `navigation.navigate('RecordStack')` が発火する |
| render tabs | 中央スロットに通常ラベル/アイコンを描画しない |
