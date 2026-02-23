# RecordScreen ナビゲーションルール

## `targetDate` は編集モードでも必ず渡す

RecordScreen のヘッダー日付は `route.params?.targetDate` を参照する。
`workoutId`（編集モード）しか渡さないと `targetDate` が `undefined` になり、
ヘッダーが常に今日の日付にフォールバックする。

```typescript
// ❌ NG: 編集モードで workoutId だけ渡す
navigation.navigate('Record', { workoutId: existing.id });
// → RecordScreen ヘッダーが今日の日付になる

// ✅ OK: targetDate も一緒に渡す
navigation.navigate('Record', { workoutId: existing.id, targetDate: selectedDate });
// → RecordScreen ヘッダーが選択日付を正しく表示する
```

**なぜ重要か**: `HomeStackParamList` の `Record` 型は `workoutId` と `targetDate` を
どちらもオプションとして定義しているため、型エラーにならず見落としやすい。

## RecordScreen のヘッダー日付ロジック

```typescript
// RecordScreen.tsx
const targetDate = route.params?.targetDate;
const headerDateString = targetDate ?? format(new Date(), 'yyyy-MM-dd');  // ← targetDateがないと今日になる
```

`session.startSession()` の呼び出し側では `workoutId` と `targetDate` は独立しているため、
両方渡しても動作に支障はない（`workoutId` がある場合はセッション開始に `targetDate` は使われない）。

## 適用箇所

- `CalendarScreen.tsx` > `handleRecordOrEdit`
- 将来 RecordScreen へ遷移するコンポーネントを追加する場合も同様
