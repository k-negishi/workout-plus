# 実装計画: SetRow iOS 日本語入力 IME 修正

---

## アーキテクチャ方針

### 変更戦略: Filtered Local State パターン

`NumericInput.tsx` が既に採用しているパターン（ローカル state + フィルタリング + onBlur 正規化）を SetRow に直接適用する。

```
変更前（controlled）:
onChangeText → 親 state → re-render → value 再設定 → IME リセット

変更後（local state バッファ）:
onChangeText → ローカル state 更新 → 表示は即座に反映
           ↘ 有効な数値のみ親へ通知 → 親 state 更新 → re-render
                                    → value = ローカル state（影響なし）
onBlur → ローカル state を親の値に正規化
```

### なぜ uncontrolled（defaultValue）を採用しないか

- `defaultValue` はマウント後の親 state 変更が反映されない
- 編集モード（既存ワークアウトのロード）で initial value が更新される場合に問題になる
- local state + onBlur のほうが制御が明示的で追いやすい

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `apps/mobile/src/features/workout/components/SetRow.tsx` | local state 追加、フィルタリング実装、onBlur 追加 |
| `apps/mobile/src/features/workout/components/__tests__/SetRow.test.tsx` | 新規テスト追加（フィルタリング・onBlur） |

---

## 実装詳細

### SetRow.tsx の変更

```typescript
// 変更前: state なし、controlled
const handleWeightChangeText = useCallback(
  (text: string) => {
    onWeightChange(set.id, parseInputToNumber(text));
  },
  [set.id, onWeightChange],
);
<TextInput value={set.weight != null ? String(set.weight) : ''} ... />
```

```typescript
// 変更後: local state + フィルタリング
const [weightText, setWeightText] = useState<string>(
  set.weight != null ? String(set.weight) : '',
);
const [repsText, setRepsText] = useState<string>(
  set.reps != null ? String(set.reps) : '',
);

const handleWeightChangeText = useCallback(
  (text: string) => {
    // 数値以外を除去（日本語IMEが混入させた文字も除去）
    const cleaned = text.replace(/[^0-9.]/g, '');
    // 小数点の重複を防ぐ（例: "6.5.3" → "6.53"）
    const parts = cleaned.split('.');
    const normalized = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : cleaned;
    setWeightText(normalized);
    onWeightChange(set.id, parseInputToNumber(normalized));
  },
  [set.id, onWeightChange],
);

const handleWeightBlur = useCallback(() => {
  // フォーカスを外したとき、親の値に正規化
  setWeightText(set.weight != null ? String(set.weight) : '');
}, [set.weight]);

<TextInput value={weightText} onChangeText={handleWeightChangeText} onBlur={handleWeightBlur} ... />
```

---

## TDD: テスト計画

### Red フェーズ（先に書くテスト）

1. `日本語文字 "あ" を含む入力はフィルタリングされ onWeightChange が呼ばれないこと`
2. `重量フィールドに "1あ0" を入力すると "10" のみ親に通知されること`
3. `onBlur 時に重量フィールドの表示が親の set.weight に戻ること`
4. `レップフィールドに日本語文字を含む入力はフィルタリングされること`
5. `小数点重複入力 "6..5" が "6.5" に正規化されること`

### Green フェーズ（実装でテストを通す）

SetRow.tsx を修正して全テスト PASS。

### Refactor フェーズ

コメント整備・型整合性確認。
