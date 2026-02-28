---
name: jest-patterns
description: Jest テスト記述パターン集。require/import の使い分け、spyOn のリストア、.test.ts vs .test.tsx の Jest プロジェクト分離など、よく踏む落とし穴と解法を提供する。テスト実装時・レビュー時に参照する。
allowed-tools: Read, Write, Edit, Bash
---

# Jest テストパターン

Jest テスト記述でよく踏む落とし穴と解法のリファレンス。

---

## 1. テスト本体内の `require()` は使わない

`jest.spyOn` などでテスト本体内に `require()` を書くと
`@typescript-eslint/no-require-imports` ESLint エラーになる。

```typescript
// NG: テスト内 require() は ESLint エラー
it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
});

// OK: ファイル先頭で import してから spyOn
import { Alert } from 'react-native';

it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  alertSpy.mockRestore();
});
```

`jest.mock()` の **factory 内** は `require()` が必要なケースがあるため許容される。
テスト関数内とは区別すること。

```typescript
// OK: jest.mock() factory 内の require() は許容される（ホイスティング対応のため）
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Swipeable: ({ children }) => React.createElement(View, null, children) };
});
```

---

## 2. `jest.spyOn` のリストア漏れを防ぐ

リストア漏れは後続テストへの副作用を引き起こす。
必ず `mockRestore()` するか `afterEach` で一括リストアする。

```typescript
// パターン A: テスト内で手動リストア
it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  // ... テスト ...
  alertSpy.mockRestore();
});

// パターン B: afterEach で一括リストア（スパイが複数ある場合に推奨）
afterEach(() => {
  jest.restoreAllMocks();
});
```

---

## 3. `.test.ts` vs `.test.tsx`: Jest プロジェクトの使い分け

このプロジェクトの Jest は 2 プロジェクト構成になっている:

| 拡張子 | Jest project | トランスフォーム | 用途 |
|--------|-------------|-----------------|------|
| `.test.ts` | "logic" | babel-jest のみ | 純粋なロジック（DB・ストア・ユーティリティ） |
| `.test.tsx` | "components" | jest-expo（RN 対応） | RN コンポーネント・フックのテスト |

`@testing-library/react-native` の API（`renderHook`, `render`, `fireEvent` 等）を
使うテストは **必ず `.test.tsx`** にする。`.test.ts` で呼ぶと RN の ESM 構文が
Babel 変換されずにクラッシュする。

```typescript
// NG: .test.ts で renderHook を使うと
// SyntaxError: Cannot use import statement outside a module
//   ↑ react-native/index.js の `import typeof ...` が変換されない

// OK: .test.tsx にする → "components" jest project が RN を変換してくれる
```

**判断基準**: RN の API に一切触れないロジックのみなら `.ts`、それ以外は `.tsx`。

---

## 4. `pnpm --filter` 経由のテスト実行で引数が壊れる

`pnpm --filter mobile test -- --testPathPattern='xxx'` はパースが
pnpm → package.json scripts → jest の3段階を経るため、パターンが正しく渡らないことがある。

```bash
# NG: pnpm filter 経由だと "No tests found" になるケースあり
pnpm --filter mobile test -- --testPathPattern='calendar'

# OK: apps/mobile に移動して npx jest を直接実行
cd apps/mobile && npx jest --testPathPattern='calendar'
```

特に `--no-coverage` 等のハイフン付きオプションはパースで壊れやすい。
テストが見つからないエラーが出たら、まず `npx jest` 直接実行を試す。

---

## 5. `replace_all: true` はテストの describe ブロックを破壊する危険がある

テストファイルで `replace_all: true` を使うと、同一パターンが
describe ブロック内外の複数箇所にあった場合にブロック構造が壊れることがある。
ESLint auto-fix が孤立コードを自動削除し、テストブロックごと消滅するケースがある。

**発生例**:

```typescript
// 「    mockFindRecording.mockResolvedValue(null);」を replace_all: true で全置換
// → describe('Y') ブロック内でもマッチしてヘッダー行が消える
// → linter が「孤立コード」として削除 → テストブロックごと消滅
```

**対処**:

- `replace_all: true` は使わず、各 describe 内の出現を個別に Edit する
- どうしても使う場合は事前に Grep で全マッチ箇所と周辺コンテキストを確認してから実行
- 実行後は必ず `git diff` でブロック構造が保たれているか確認する

---

## 7. `jest.clearAllTimers()` は fake system time をリセットする

`jest.useFakeTimers()` + `jest.setSystemTime()` で日付を固定しているテストで、
`beforeEach` に `jest.clearAllTimers()` を書くと **fake system time がリセットされる**。
`setSystemTime` を呼ばないと以降のテストで日付がズレてテストが失敗する。

```typescript
// NG: clearAllTimers 後に setSystemTime を呼び忘れる
jest.useFakeTimers();
jest.setSystemTime(new Date(2026, 1, 21)); // モジュールレベルで固定

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers(); // ← ここで fake system time がリセットされる！
  // この後の Date.now() は実際の現在時刻を返す → テストが壊れる
});

// OK: clearAllTimers の直後に必ず再設定する
jest.useFakeTimers();
jest.setSystemTime(new Date(2026, 1, 21));

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.setSystemTime(new Date(2026, 1, 21)); // ← 必ず再設定
});
```

**適用ケース**: `Date` に依存するコンポーネント（カレンダー、タイムスタンプ表示など）のテストで
`useFakeTimers` + `setSystemTime` を使っている場合、`beforeEach` に必ずセットにして書く。

---

## 6. 事前存在するテスト失敗の検証: `git stash` の罠

自分の変更が原因のテスト失敗かを確認するため `git stash` を使うと、
リポジトリの**全ての**未コミット変更がスタッシュされる（他人の変更も含む）。
結果として stash pop 後の状態が意図と異なり混乱しやすい。

```bash
# NG: カレントディレクトリ全体をスタッシュ → 他の未コミット変更も消える
git stash

# OK: 自分のファイルだけスタッシュして比較
git stash -- apps/mobile/src/my-file.ts

# OK: そもそも stash せず HEAD 版を直接確認
git show HEAD:apps/mobile/src/my-file.ts | grep <pattern>

# OK: 問題のテストスイートだけ直接実行して確認
cd apps/mobile && npx jest src/features/calendar --no-coverage 2>&1 | grep "Tests:"
```

事前存在の失敗か確認するだけなら `git stash` より `git show HEAD:<file>` か
特定テストの直接実行が確実で副作用が少ない。

