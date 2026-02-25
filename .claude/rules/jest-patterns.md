# Jest テストパターン

## `jest.spyOn` には `require()` を使わない

テスト本体内で `require()` を使うと `@typescript-eslint/no-require-imports` ESLint エラーになる。

```typescript
// NG: テスト内 require() は ESLint エラー
it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
  // ↑ error: A `require()` style import is forbidden
});

// OK: ファイル先頭で import してから spyOn
import { Alert } from 'react-native';

it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  // ...
  alertSpy.mockRestore();
});
```

**なぜ `require()` が混入するか**: `jest.mock()` の factory 内では `require()` が必要なケースがあるため、
同じノリでテスト本体内にも書いてしまいがち。factory 内は許容されるが、通常のテスト関数内は NG。

```typescript
// OK: jest.mock() factory 内の require() は許容される（ホイスティング対応のため）
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');       // ← factory 内は OK
  const { View } = require('react-native'); // ← factory 内は OK
  return { Swipeable: ({ children }) => React.createElement(View, null, children) };
});
```

## `jest.spyOn` のリストア漏れを防ぐ

`jest.spyOn` で上書きしたモックは必ず `mockRestore()` するか、`afterEach` で自動リストアする。
リストア漏れがあると後続テストに副作用が出る。

```typescript
// パターン A: テスト内で手動リストア
it('Alert が呼ばれる', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  // ... テスト ...
  alertSpy.mockRestore(); // 必ずリストア
});

// パターン B: afterEach で一括リストア（スパイが複数ある場合）
afterEach(() => {
  jest.restoreAllMocks();
});
```
