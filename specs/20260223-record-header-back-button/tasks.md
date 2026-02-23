# タスク一覧: RecordScreen ヘッダー改修（Issue #131）

## サマリー
- 総タスク数: 4
- ユーザーストーリー: US-1/US-2/US-3 を統合実装（ヘッダー刷新）
- 並列実行可能: T-01 と T-02 は独立して実施可能（T-02 は T-01 の実装待ち）

---

## T-01: 失敗テストを先に書く（Red フェーズ）

**優先度**: 高（TDD 必須）
**依存**: なし
**並列**: 単独実施

### 内容

`RecordScreen.test.tsx` に以下のテストを追加する（まだ実装がないため Red になる）:

```typescript
describe('ヘッダー（Issue #131）', () => {
  it('戻るボタンが表示される', () => {
    render(<RecordScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('戻るボタンをタップすると goBack が呼ばれる', () => {
    render(<RecordScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('ヘッダーに日付タイトルが中央寄せで表示される', () => {
    render(<RecordScreen />);
    const title = screen.getByTestId('record-header-title');
    expect(title).toBeTruthy();
    expect(title.props.style).toEqual(expect.objectContaining({ textAlign: 'center' }));
  });

  it('ヘッダーの背景色が青系統 (#4D94FF) である', () => {
    render(<RecordScreen />);
    const header = screen.getByTestId('record-header');
    expect(header.props.style).toEqual(expect.objectContaining({ backgroundColor: '#4D94FF' }));
  });
});
```

また、既存の SafeArea テスト `insets.top に基づいた paddingTop がヘッダーに適用される` を修正する:
- 検証対象を `record-screen-container` から `record-header` に変更する
- `paddingTop` の期待値を `insets.top (44)` に修正する

- [x] T-01

---

## T-02: ヘッダー実装（Green フェーズ）

**優先度**: 高
**依存**: T-01（テストが Red になっていること確認後）
**並列**: T-01 の完了後

### 内容

`RecordScreen.tsx` の変更:

1. `Ionicons` を `@expo/vector-icons` から import する
2. コンテナ View の `paddingTop: insets.top` を削除する
3. 白いヘッダー View を青いヘッダーに置き換える:
   - `testID="record-header"` を付与する
   - `backgroundColor: '#4D94FF'`
   - `paddingTop: insets.top`（SafeArea をここで吸収）
   - `paddingBottom: 12`
   - `paddingHorizontal: 16`
   - 内部: 3列 flexRow（戻るボタン / タイトル / スペーサー）
4. 戻るボタン:
   - `TouchableOpacity` + `Ionicons name="chevron-back" size={24} color="#ffffff"`
   - `onPress={() => navigation.goBack()}`
   - `accessibilityLabel="戻る"`
   - `width: 40`
5. タイトル:
   - `testID="record-header-title"`
   - `flex: 1`、`textAlign: 'center'`、`fontSize: 16`、`fontWeight: '600'`、`color: '#ffffff'`
6. 右スペーサー: `width: 40` の `View`

- [x] T-02

---

## T-03: テスト実行（Green 確認）

**優先度**: 高
**依存**: T-02
**並列**: 単独実施

### 内容

```bash
pnpm --filter mobile test -- --testPathPattern="RecordScreen" --no-coverage
```

すべてのテスト（既存 + 新規）が Pass することを確認する。

- [x] T-03

---

## T-04: 型チェック・Lint 確認

**優先度**: 中
**依存**: T-02
**並列**: T-03 と並列実施可能

### 内容

```bash
pnpm --filter mobile tsc --noEmit
pnpm lint
```

エラーゼロを確認する。

- [x] T-04
