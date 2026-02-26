# 種目選択画面 UI 改善（Issue #166）

## 概要

種目選択画面（`ExercisePickerScreen`）のセクションヘッダー視認性向上、
「マイ種目」セクション廃止、お気に入りスターのアイコン視認性改善を行う。

## 背景

- セクションヘッダーのテキスト色（`#334155`）が種目名（`#334155`）と同一で区別しにくい
- 「マイ種目」セクションはカテゴリと役割が重複しており不要
- お気に入りスター（`☆` テキスト文字）がサイズ・コントラスト不足で視認性が低い

## 要件

### R1: セクションヘッダーの視認性向上

- 背景色に薄いグレー（`#F8FAFC`）を付けて種目行と区別する
- 文字色を薄いグレー（`#94a3b8`）に変更し、種目名より明確に格下げする
- フォントサイズを 12px に縮小し、件数表示も縮小する
- 「お気に入り」セクションヘッダーには `Ionicons star` アイコンを前置する

### R2: 「マイ種目」セクション廃止

- `computeSections` からマイ種目分離ロジックを削除する
- カスタム種目（`isCustom: true`）はお気に入りでなければカテゴリ別セクションに含める
- 「マイ種目」セクションタイトルは今後表示されない

### R3: お気に入りスターのアイコン改善

- `ExercisePickerScreen` の `ExerciseItemActions` コンポーネントにて：
  - テキスト文字（`★` / `☆`）の代わりに `Ionicons star` / `star-outline` を使用する
  - サイズ: 20px
  - お気に入り済み: `#F59E0B`（アンバー）
  - 未お気に入り: `#CBD5E1`（薄いグレー、opacity なし）

## 影響範囲

- `apps/mobile/src/features/exercise/hooks/useExerciseSearch.ts` — `computeSections`
- `apps/mobile/src/features/exercise/screens/ExercisePickerScreen.tsx` — `renderSectionHeader`, `ExerciseItemActions`
- `apps/mobile/src/features/exercise/hooks/__tests__/useExerciseSearch.test.ts` — テスト更新

## 非機能要件

- 既存の他テストが壊れないこと
- TypeScript 型エラーなし
- ESLint / Prettier エラーなし
