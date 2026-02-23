# Research: 種目選択カスタム並び順

## 技術選定

### D1: ドラッグ&ドロップライブラリ

**選択: `react-native-draggable-flatlist`**

| 候補 | 根拠 |
|---|---|
| react-native-draggable-flatlist | Reanimated v2+ API互換（v4でも動作）、GestureHandler使用済み、JS-onlyライブラリのためExpo Goで追加ネイティブ不要 |
| 自前実装（PanResponder + Reanimated） | 実装コスト高、バグリスク大 |
| @breeffy/react-native-reorder-list | メンテナンス不活発 |

**Expo Go制約**: `react-native-draggable-flatlist`はJS層のライブラリ。依存する`react-native-reanimated`と`react-native-gesture-handler`は共にExpo SDK 52バンドル済みのため問題なし。

**バージョン固定**: `~4.3.0`（caret禁止ルールに従う）

### D2: sort_order の初期値

**選択: `rowid` を初期値として使用**

- SQLiteの`rowid`は挿入順序を反映する（自動インクリメント整数）
- `UPDATE exercises SET sort_order = rowid` で登録順の初期値を一括設定可能
- 仮にrowidが1から始まると全プリセット種目がその順番通りに並ぶ（seed挿入順）

### D3: sort_order の一意制約

**選択: 一意制約なし**

- D&D後のバルクUPDATEで「一意違反」が発生しやすい（中間状態で重複が生じる）
- アプリ層で重複防止（保存時にindex=0,1,2...を割り当て）

### D4: 新規種目のsort_order割り当て

**選択: `(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exercises)` をINSERT時にセット**

- アプリ層ではなくSQL式で取得し、`create()` メソッド内で計算してから INSERT

### D5: 保存時のバルクUPDATE方式

**選択: `UPDATE exercises SET sort_order = ? WHERE id = ?` をループ実行（withTransactionAsync）**

- SQLiteのUPDATE ... CASE ... WHEN構文より可読性が高い
- トランザクション内でループするため原子性を確保

### D6: 並び替えモーダルの表示形式

**選択: フルスクリーンモーダル（`react-native Modal`）**

- 全種目を一度に表示するため高さが必要
- ExistingのExercisePickerScreen自体がフルスクリーンモーダルなので同じスタイルで一貫性あり

### D7: ExerciseSortModal のテスト方針

`react-native-draggable-flatlist`の実際のドラッグインタラクションはユニットテストが困難（ジェスチャーシミュレーションが必要）。

**テスト対象**:
1. `ExerciseRepository.updateSortOrders()` — 純粋なDB操作、テスト可能
2. `ExerciseRepository.create()` の`sort_order`設定 — テスト可能
3. Migration v6 — テスト可能
4. モーダルの描画・キャンセル動作 — `render()`でテスト可能
5. ドラッグ動作 — **`/* istanbul ignore next */`で除外（ジェスチャーはE2Eテスト領域）**
