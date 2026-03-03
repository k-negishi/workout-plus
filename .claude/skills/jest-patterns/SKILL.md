---
name: jest-patterns
description: Jest テスト記述パターン集。require/import の使い分け、spyOn のリストア、.test.ts vs .test.tsx の Jest プロジェクト分離など、よく踏む落とし穴と解法を提供する。テスト実装時・レビュー時に参照する。
allowed-tools: Read, Write, Edit, Bash
---

# Jest テストパターン

Jest テスト記述でよく踏む落とし穴と解法のリファレンス。
汎用 Jest & Testing Library パターン集。React Native 固有のテストは react-native-testing スキルを参照。

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

## 6. `jest.clearAllTimers()` は fake system time をリセットする

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

## 7. 事前存在するテスト失敗の検証: `git stash` の罠

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

---

## 8. ESLint 10 + vitest 互換性

### 問題

`eslint-plugin-vitest@0.5.x` は内部で `@typescript-eslint/utils@7.x` に依存しており、
ESLint 10 と組み合わせると以下のエラーで即クラッシュする:

```
TypeError: Class extends value undefined is not a constructor or null
    at LegacyESLint.js ...
```

### 解決策

`eslint-plugin-vitest` の代わりに公式後継パッケージ `@vitest/eslint-plugin` を使う。

```bash
pnpm remove eslint-plugin-vitest
pnpm add -D @vitest/eslint-plugin
```

```js
// eslint.config.mjs
import vitest from '@vitest/eslint-plugin';  // ← eslint-plugin-vitest ではない

export default [
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
];
```

### なぜ起きるか

pnpm の peer dep 解決で `eslint-plugin-vitest@0.5.x` が `@typescript-eslint/utils@7.x` を
要求し、同一プロセス内で `@typescript-eslint/utils@8.x`（ESLint 10 対応版）と競合する。
monorepo ではホイスト先が意図せず 7.x になるケースがある。

### 適用タイミング

- vitest を使うパッケージに ESLint を導入するとき
- ESLint を 9 → 10 にアップグレードするとき

---

## 10. `expo/virtual/env` ESM を Jest で解決できない問題

`babel-preset-expo` は `process.env.EXPO_PUBLIC_*` アクセスをビルド時に
ESM モジュール `expo/virtual/env` への import に変換する。
Jest の logic project（CommonJS）はこの ESM を解決できないため、
`SyntaxError: Cannot use import statement outside a module` でクラッシュする。

**解決策**: CJS モックを作成して `moduleNameMapper` に追加する。

```javascript
// apps/mobile/__mocks__/expo-virtual-env.js
module.exports = { env: process.env };
```

```typescript
// apps/mobile/jest.config.ts（logic project の moduleNameMapper に追加）
moduleNameMapper: {
  '^expo/virtual/env$': '<rootDir>/__mocks__/expo-virtual-env.js',
  // ...
}
```

**なぜこうなるか**:
`babel-preset-expo` は `process.env.EXPO_PUBLIC_*` を安全にバンドルするために
`import { env } from 'expo/virtual/env'` に置き換える。
Hermes・ブラウザでは ESM として解決されるが、
Jest の CommonJS 環境では解決できない。
`__mocks__/` への CJS モックで bypass する。

**適用タイミング**: `EXPO_PUBLIC_*` 変数を読むモジュール（環境変数系・feature flag 系）をテストするとき。

---

## 11. `testing-library/prefer-find-by`: waitFor+getBy は findBy に変換する

ESLint ルール `testing-library/prefer-find-by` により、
「要素出現を待つだけの `waitFor`」は `findBy*` に書き直す必要がある。

```typescript
// NG: prefer-find-by エラー（要素取得だけの waitFor）
await waitFor(() => screen.getByTestId('stepper-increment'));
await waitFor(() => screen.getByText('解禁済み'));

// OK: findBy* を使う
await screen.findByTestId('stepper-increment');
await screen.findByText('解禁済み');
```

**多段階テスト（出現待ち→操作→結果確認）の典型パターン**:

```typescript
// 出現を待つ（findBy） → 操作（同期 getBy） → 結果確認（waitFor + expect）
await screen.findByTestId('invite-code-row');            // ← 出現待ち: findBy
fireEvent.press(screen.getByTestId('invite-code-row')); // ← 操作: 同期 getBy のまま OK
await waitFor(() => {
  expect(screen.getByTestId('invite-code-form')).toBeTruthy(); // ← 結果確認: waitFor+expect のまま OK
});
```

**ルールの対象外（waitFor+expect の複数行は OK）**:
```typescript
// 複数 expect を含む waitFor はルール対象外（そのまま OK）
await waitFor(() => {
  expect(screen.getByText('4回')).toBeTruthy();
  expect(screen.getByText('設定')).toBeTruthy();
});
```

---

## 12. 環境変数依存モジュール: `jest.resetModules()` + `require()` でテストする

モジュール読み込み時に `process.env.*` を参照するモジュール（定数として束縛される）は、
`jest.resetModules()` でキャッシュをリセットしてから `require()` で再取得することで
環境変数の変化を反映できる。

```typescript
// inviteCode.ts（モジュール読み込み時に評価される定数）
const VALID_INVITE_CODE = process.env['EXPO_PUBLIC_INVITE_CODE'] ?? '';
```

```typescript
// inviteCode.test.ts
describe('環境変数あり', () => {
  beforeEach(() => {
    process.env['EXPO_PUBLIC_INVITE_CODE'] = 'test-code-2026';
    jest.resetModules(); // キャッシュをリセット
  });
  afterEach(() => {
    delete process.env['EXPO_PUBLIC_INVITE_CODE'];
  });

  it('正しいコードで true を返す', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('test-code-2026')).toBe(true);
  });
});
```

**注意点**:
- `jest.resetModules()` は `beforeEach` で呼ぶ（テスト間の独立性）
- `require()` はテスト内で毎回呼ぶ（リセット後に再取得）
- `no-require-imports` エラーは `// eslint-disable-next-line` で抑制する

**適用タイミング**: 環境変数や feature flag を定数として束縛するモジュールで
「設定 A のとき」「設定 B のとき」を別ケースでテストしたい場合。

---

## 9. `test.each` のコールバック引数は配列要素数と一致させる（TS2345）

`test.each` に渡す配列の要素数とコールバック引数の数が食い違うと TypeScript エラー（TS2345）になる。
説明文字列など「テストの論理には不要だが配列に含めているもの」も含めて数を合わせること。

```typescript
// NG: データが [weight, reps, expected, description] の4要素だがコールバックが3引数
// → TS2345: Argument of type '(...args: [..., string]) => void' is not assignable
test.each([
  [60, 10, true, '通常セット'],
])('weight=%s reps=%s → %s（%s）', (weight, reps, expected) => {
  expect(fn({ weight, reps })).toBe(expected);
});

// OK: 4つ目を _description として受け取る（使わなくても型エラーが消える）
test.each([
  [60, 10, true, '通常セット'],
  [null, 10, false, 'weight が null'],
])('weight=%s reps=%s → %s（%s）', (weight, reps, expected, _description) => {
  expect(fn({ weight: weight as number | null, reps: reps as number | null })).toBe(expected);
});
```

**適用タイミング**: `test.each` にラベル・メモ用の文字列を追加した直後。
`_description` のアンダースコアプレフィックスで「意図的な未使用」を明示する。

---

## 13. `unicorn/consistent-function-scoping`: テストヘルパーは describe 外に置く

`unicorn` プラグインを ESLint に追加すると、`describe` ブロック内で定義された
関数が外部スコープの変数を一切使っていない場合にエラーになる。

**対象**: モック DB ファクトリ、`createMock*`、`setupMock*`、`makeXxx` 系のヘルパー関数

```typescript
// NG: describe 内に定義 → unicorn/consistent-function-scoping エラー
describe('runMigrations V5 → V6', () => {
  function createMockDbV5() {   // error: Move function to the outer scope
    let schemaVersion = 5;
    // ...
  }
  it('...', () => { const db = createMockDbV5(); });
});

// ✅ OK: describe の外（モジュールレベル）に移動
function createMockDbV5() {
  let schemaVersion = 5;
  // ...
}

describe('runMigrations V5 → V6', () => {
  it('...', () => { const db = createMockDbV5(); });
});
```

**なぜルールが存在するか**: 外部スコープの変数を使わない関数を describe 内に閉じ込めても
メモリ的・意味的メリットがなく、テストヘルパーの再利用性が下がるため。

**発生タイミング**: eslint.config.mjs に `unicorn` プラグインを追加したとき、
既存テストの `createMock*` 関数が**一括して**エラーになる。
unicorn を導入する前から「モジュールレベルに置く」習慣を持つと修正コストがゼロになる。

**注意**: 外部スコープの `let` や `const` を参照している場合はルール対象外（外に出せない）。
例: `beforeEach` で定義した変数を参照するクロージャは describe 内に留まって問題ない。

---

## 14. UI 削除時のテスト反転パターン

UI 機能を削除・非表示化した場合、「表示されること」テストを削除するのではなく
「**表示されないこと**」に反転させてコミットすること。

```typescript
// NG: テストを削除する → 「元々あった」という事実が消える
// it('招待コード行が表示されること', () => { ... }); // ← 単純に消す

// OK: 「表示されないこと」に反転させる
it('招待コード行が表示されないこと', () => {
  render(<SettingsScreen />);
  // queryBy は要素が存在しない場合に null を返す（getBy はエラーになるので使わない）
  expect(screen.queryByTestId('invite-code-row')).toBeNull();
});
```

**なぜ反転させるか**:
- テストを削除すると「意図的に非表示にした」という記録が消える
- 反転させることで「この機能は存在するが意図的に隠している」という仕様変更の証跡になる
- 将来 UI を復活させる際に「元はどんかテストがあったか」を参照できる

**適用タイミング**: UI コンポーネントを削除・非表示化したとき。
削除ではなく「条件付きで表示しない」実装に変わった場合も同様。

**関連するテスト削除の判断基準**:

| 変更の性質 | テストの扱い |
|---|---|
| UI を非表示化（ロジックは残す） | 「表示されないこと」に反転して残す |
| 機能を完全削除（ロジックごと） | テスト削除 OK |
| describe ブロック全体（招待コード操作 UI 等） | 削除 OK（ロジック側テストは別ファイルに残す） |

