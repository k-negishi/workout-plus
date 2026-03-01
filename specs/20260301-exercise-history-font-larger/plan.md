# 実装計画: 種目履歴画面の見出し・日付フォントサイズ拡大

## アーキテクチャ概要

UI-only の変更。`ExerciseHistoryFullScreen.tsx` の StyleSheet / インラインスタイル / NativeWind className を3箇所変更するのみ。

## 変更箇所

### 1. ヘッダータイトル（種目名）: 17 → 20px
```tsx
// Before
fontSize: 17,
// After
fontSize: 20,
```

### 2. セクション見出し × 3箇所: text-sm → text-base
```tsx
// Before
<Text className="text-sm font-bold text-text-primary mb-4">
// After
<Text className="text-base font-bold text-text-primary mb-4">
```
対象3箇所:
- 「直近3ヶ月の最大RM推移」
- 「PR (自己ベスト) 履歴」
- 「全履歴 (N回)」

### 3. 日付テキスト: 13 → 15px
```tsx
// Before
fontSize: 13, color: colors.textPrimary
// After
fontSize: 15, color: colors.textPrimary
```

## テスト戦略

既存テスト（`ExerciseHistoryFullScreen.test.tsx`）が snapshot を持つ場合は更新。
レンダリング確認のスモークテストを追加する。

## リスク

- text-base（16px）でセクション見出しが長い場合に折り返す可能性があるが、
  「直近3ヶ月の最大RM推移」は最長で幅に収まることを確認済み
