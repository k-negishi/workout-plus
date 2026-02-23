# 仕様書: カレンダーから過去日付のワークアウトを記録

- **Feature ID**: 20260222-カレンダー過去日付ワークアウト登録
- **GitHub Issue**: #120
- **作成日**: 2026-02-22
- **ステータス**: Draft

---

## 概要

カレンダー画面で過去日付を選択した状態で+ボタンを押すと、選択日付でワークアウトを記録できる。
これまで+ボタンは常に「今日」のワークアウトしか開始できなかった。

---

## ユーザーストーリー

| ID | ストーリー |
|----|-----------|
| US-1 | ジムで記録し忘れた日のワークアウトを後から登録したい |
| US-2 | カレンダーで日付を選び、その日に種目・セットを追記したい |

---

## 動作仕様

### +ボタン押下時の分岐

| 条件 | 動作 |
|------|------|
| カレンダータブ以外がアクティブ | 従来通り（今日のワークアウト → RecordScreen） |
| カレンダータブがアクティブ & 選択日が今日 | 従来通り（今日のワークアウト → RecordScreen） |
| カレンダータブがアクティブ & 選択日が未来 | 従来通り（今日扱い） |
| カレンダータブがアクティブ & 選択日が過去 | **確認ダイアログを表示** |

### 確認ダイアログ（Alert.alert）

- メッセージ: `「M月D日のワークアウトを記録しますか？」`
- ボタン:
  - `[キャンセル]` — style: 'cancel'、何もしない
  - `[記録する]` — 選択日付で RecordScreen に遷移

### 過去日付に既存ワークアウトがある場合（追記モード）

1. `WorkoutRepository.findCompletedByDate(dateString)` で同日の completed ワークアウトを取得
2. `store.setPendingContinuationWorkoutId(workoutId)` + `targetDate` 付きで RecordTab に navigate
3. RecordScreen で既存の種目・セットが復元された状態で種目を追加できる

### 過去日付にワークアウトがない場合（新規作成モード）

1. `targetDate` のみ RecordTab に navigate（workoutId なし）
2. `WorkoutRepository.create({ createdAt: 選択日付の UNIX ms })` で新規作成

### RecordScreen ヘッダー日付表示

- TimerBar の上に日付ヘッダーを追加
- 表示フォーマット: `「M月D日のワークアウト」`（例: `2月14日のワークアウト`）
- 今日の場合も表示する（一貫した UI）
- スタイル: #475569 / fontSize: 13 / fontWeight: '500'（控えめ）

### ワークアウト完了時のタイムスタンプ

- `created_at` = 選択日付の UNIX ミリ秒（日付の 00:00:00 JST）
- `completed_at` = 選択日付の UNIX ミリ秒（`completeWorkout()` 時に targetDate を使用）

---

## 技術仕様

### 新規追加: Zustand store フィールド

```typescript
// workoutSessionStore.ts に追加
calendarSelectedDate: string | null;        // 'yyyy-MM-dd' | null
setCalendarSelectedDate: (date: string | null) => void;
```

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stores/workoutSessionStore.ts` | `calendarSelectedDate` フィールド追加 |
| `features/calendar/screens/CalendarScreen.tsx` | 日付タップ時に `setCalendarSelectedDate()` を呼び出す |
| `app/MainTabs.tsx` | FloatingRecordButton: タブ判定 + 過去日付分岐 + 確認ダイアログ |
| `types/navigation.ts` | `RecordStackParamList.Record` に `targetDate?: string` 追加 |
| `database/repositories/workout.ts` | `findCompletedByDate()` メソッド追加、`create()` に `createdAt` オプション追加 |
| `features/workout/hooks/useWorkoutSession.ts` | `startSession(workoutId?, targetDate?)` シグネチャ拡張 |
| `features/workout/screens/RecordScreen.tsx` | `targetDate` params 受け取り + ヘッダー日付表示追加 |

---

## 受け入れ基準

- [ ] カレンダーで過去日付を選択 → +ボタン → 確認ダイアログが表示される
- [ ] 確認後、RecordScreen に遷移し、ヘッダーに選択日付が表示される
- [ ] 過去日付の新規ワークアウトが `created_at` = 選択日付で保存される
- [ ] 過去日付の既存ワークアウトに種目を追記できる
- [ ] ワークアウト完了時、`completed_at` が選択日付で保存される
- [ ] カレンダータブ以外からの+ボタンは従来動作のまま
- [ ] カレンダータブで今日を選択中の+ボタンは従来動作のまま
- [ ] 未来日付では過去日付用のダイアログは出ない（今日扱い）
- [ ] RecordScreen ヘッダーに日付が正しく表示される
