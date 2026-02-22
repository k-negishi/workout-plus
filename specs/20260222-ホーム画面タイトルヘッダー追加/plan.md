# Implementation Plan: ホーム画面タイトルヘッダー追加

**Branch**: `20260222-ホーム画面タイトルヘッダー追加` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260222-ホーム画面タイトルヘッダー追加/spec.md`

## Summary

ホーム画面の最上部（ScrollView内・StreakCardの上）に、アプリタイトル "Workout+" と設定アイコンボタンを含む横一行のヘッダー行を追加する。ヘッダーはコンテンツとともにスクロールアウトする（固定なし）。設定ボタンは将来対応のためタップ時アクションなし。変更対象は `HomeScreen.tsx` と対応テストのみ。

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React Native 0.81.5 (Expo SDK 52), `@expo/vector-icons` (Ionicons, 既存導入済み), `react-native-safe-area-context`
**Storage**: N/A（UIのみ）
**Testing**: Jest 29 + @testing-library/react-native
**Target Platform**: iOS 16+ / Android 10+
**Project Type**: mobile
**Performance Goals**: レンダリング追加なし（静的UIのみ）
**Constraints**: Expo Go 互換（ネイティブモジュール追加不可）
**Scale/Scope**: 単一コンポーネント変更（HomeScreen.tsx）

## Constitution Check

### I. ローカルファースト ✅
UIのみの変更。データアクセスなし。

### II. 引き算のデザイン ✅
- テキスト + アイコン1個のシンプルな行追加
- グラデーション不使用・シャドウなし
- border-radius 追加なし
- padding は既存の4px倍数系統を継承

### III. MVPスコープ厳守 ✅
- 仕様通りのスコープ。設定画面実装は含めない（「後でやる」確認済み）
- 既存ナビゲーション型に変更なし

### IV. マネージドサービス専用 ✅ N/A

### V. 個人開発の持続可能性 ✅
- 変更ファイル: 2ファイル（HomeScreen.tsx + テスト）
- 新規ライブラリ: なし

### VI. テスト・品質規律 ✅
- 新しい UI 要素に対応するテストを追加
- `testID` を使用したアサーション
- `@expo/vector-icons` をテスト環境でモック

## Project Structure

### Documentation (this feature)

```text
specs/20260222-ホーム画面タイトルヘッダー追加/
├── plan.md              ← このファイル
├── research.md          ← Phase 0 出力
├── spec.md              ← 仕様書
├── checklists/
│   └── requirements.md
└── tasks.md             ← /speckit.tasks コマンドで生成（未作成）
```

### Source Code

```text
apps/mobile/src/features/home/
├── screens/
│   ├── HomeScreen.tsx                     ← 変更: タイトルヘッダー行追加
│   └── __tests__/
│       └── HomeScreen.test.tsx            ← 変更: タイトル・設定ボタンのテスト追加
```

**Structure Decision**: Option 3 (モバイルアプリ)。変更は `features/home/screens/` 以下のみ。コンポーネント抽出は行わない（HomeScreen内の軽微なUI変更）。

## 実装詳細

### HomeScreen.tsx への変更

既存の白背景ヘッダー `<View>` の先頭にタイトル行を追加する。

**変更前の構造**:
```
ScrollView
└── View (白背景ヘッダー, paddingTop: insets.top + 16)
    └── StreakCard
```

**変更後の構造**:
```
ScrollView
└── View (白背景ヘッダー, paddingTop: insets.top + 16)
    ├── View (タイトル行: flex-row, justify-between, align-center)
    │   ├── Text "Workout+" (fontSize:20, fontWeight:'700', color:primary)
    │   └── TouchableOpacity (testID:'settings-button', accessibilityLabel:'設定')
    │       └── Ionicons name='settings-outline' size=22 color=textSecondary
    └── StreakCard
```

**タイトル行のスタイル詳細**:
- `flexDirection: 'row'`
- `justifyContent: 'space-between'`
- `alignItems: 'center'`
- `marginBottom: 16`（StreakCardとの間隔）
- Text: `fontSize: 20`, `fontWeight: '700'`, `color: colors.primary`
- TouchableOpacity のタッチ領域: padding で最小44ptを確保

### HomeScreen.test.tsx への追加

```
describe('HomeScreen タイトルヘッダー')
  it('Workout+ タイトルが表示される')
  it('設定アイコンボタンが表示される (testID: settings-button)')
```

**Ioniconsモック追加** (`jest.mock('@expo/vector-icons', ...)`):
- テスト環境ではIconsをシンプルな View/Text に差し替え
- 既存の `react-native-svg` モックと同様のパターン

## データモデル

N/A（UIのみ。データ変更なし）

## API コントラクト

N/A（外部API呼び出しなし）

## Complexity Tracking

違反なし。全 Constitution Check 通過。
