# タスク一覧: SetRow iOS 日本語入力 IME 修正

**総タスク数:** 4
**並列実行可能:** T1（テスト先行記述）後に T2（実装）を順次実行

---

## T1: 失敗テストを先行作成（Red フェーズ）

**ファイル:** `apps/mobile/src/features/workout/components/__tests__/SetRow.test.tsx`

追加するテストケース:

- [ ] `日本語文字 "あ" を入力しても onWeightChange が呼ばれないこと（空文字扱い）`
- [ ] `"1あ0" を入力すると数値部分 "10" = 10 が親に通知されること`
- [ ] `"6..5" を入力すると "6.5" = 6.5 が親に通知されること（小数点重複の正規化）`
- [ ] `onBlur 時に表示が親の set.weight に戻ること`
- [ ] `レップフィールドに "1あ0" を入力すると数値部分 10 が親に通知されること`

**依存:** なし
**並列:** 不可（T2 の前提条件）

---

## T2: SetRow.tsx を修正（Green フェーズ）

**ファイル:** `apps/mobile/src/features/workout/components/SetRow.tsx`

- [ ] `useState` で `weightText`, `repsText` のローカル state を追加
- [ ] `handleWeightChangeText`: フィルタリング実装 + local state 更新 + 親通知
- [ ] `handleRepsChangeText`: フィルタリング実装 + local state 更新 + 親通知
- [ ] `handleWeightBlur`: `set.weight` で local state を正規化
- [ ] `handleRepsBlur`: `set.reps` で local state を正規化
- [ ] TextInput の `value` を local state に変更
- [ ] TextInput に `onBlur` prop を追加

**依存:** T1（テスト先行）
**並列:** 不可（T1 後）

---

## T3: テスト実行・検証

```bash
pnpm --filter mobile test -- --testPathPattern="SetRow"
```

- [ ] 全テスト PASS

**依存:** T2
**並列:** 不可

---

## T4: Lint / 型チェック

```bash
pnpm lint
pnpm --filter mobile tsc --noEmit
```

- [ ] Lint PASS
- [ ] 型チェック PASS

**依存:** T2
**並列:** T3 と並列実行可能
