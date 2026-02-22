# 仕様書: RecordScreen 再設計（UI刷新 + ナビゲーション統合）

## 概要

Issue #121（RecordScreen UI刷新）と Issue #124（ナビゲーション再設計）を統合実装する。
記録画面のデザインを編集画面のカードスタイルに統一し、+ボタンを廃止してホーム/カレンダーへの
記録・編集導線を再設計する。記録と編集を1画面（RecordScreen）に統一し、リアルタイム保存とする。

## ユーザーストーリー

### US-1: RecordScreen UI 統一
**ユーザーとして、** ワークアウト記録画面で種目がカード形式で表示され、
セット入力のカラム構成（Set/kg/回/1RM）が一目でわかるデザインを使いたい。
**なぜなら、** 現在のフラットレイアウトより視認性が高く、入力がしやすいから。

### US-2: +ボタン廃止・ホームからの記録開始
**ユーザーとして、** ホーム画面から「本日のワークアウトを記録」ボタンをタップして記録を開始し、
記録中の場合はバナーからその場で復帰したい。
**なぜなら、** 現在の+ボタンは状態によって挙動が変わり、操作が予測しにくいから。

### US-3: カレンダーから過去ワークアウトの記録・編集
**ユーザーとして、** カレンダーで日付を選択して編集ボタンをタップすると、その日の
ワークアウト記録・編集画面に遷移したい（当日・過去の新規作成、既存の編集どちらも対応）。
**なぜなら、** 記録し忘れた日のワークアウトを後から入力したいから。

### US-4: 記録/編集の統一画面
**ユーザーとして、** 過去のワークアウト詳細画面から「編集」ボタンをタップし、
既存の種目・セット値をリアルタイムで変更したい。
**なぜなら、** 誤入力した値を保存ボタンなしでその場で直せる方が使いやすいから。

## 機能仕様

### F-01: RecordScreen デザイン刷新

#### 種目カード（ExerciseBlock）
- 外枠: `bg-white`, border `1px #e2e8f0`, `rounded-lg`(8px), `p-4`, `mb-3`
- 種目名: `16px`, `600`, `#334155`（青から濃いグレーへ）
- 削除ボタン: テキスト `✕`, `16px`, `#64748b`, `p-1`
- 部位ラベル: `14px`, `#64748b`, `mt: 2px`（残す）
- 前回記録バッジ: 既存スタイル維持（bg `#F1F3F5`, `rounded-[8px]`, `13px`, `#64748b`）。ただし編集モード時は非表示
- ヘッダー下マージン: `mb-3`(12px)

#### カラムヘッダー行（新規追加）
```
コンテナ: flex-row gap-2 px-2 pb-2
Set : w-8,   11px 600 #64748b text-left
kg  : flex-1, 11px 600 #64748b text-center
(空): w-4    （x 区切りスペーサー）
回  : flex-1, 11px 600 #64748b text-center
1RM : w-12,  11px 600 #64748b text-center
(削): w-5    （削除ボタンスペーサー）
```

#### セット行
- 行全体: `flex-row items-center gap-2`（枠線なし）
- セット番号: `w-8`(32px), `14px`, normal, `#64748b`, `text-left`
- 入力フィールド: `TextInput`直接使用（NumericInput 廃止）
  - `flex-1`, `bg-[#FAFBFC]`, `border border-[#e2e8f0]`, `rounded-lg`, `py-2`
  - `15px`, `600`, `#334155`, `text-center`
  - placeholder: `"-"`, placeholderTextColor `#94a3b8`
  - 重量: `keyboardType="decimal-pad"`
  - レップ: `keyboardType="number-pad"`
- x 区切り: テキスト`"x"`, `14px`, `#64748b`
- 1RM: `w-12`, `13px`, `#64748b`, `text-center`, 未計算時`"-"`
- 削除: テキスト`"✕"`, `12px`, `#64748b`, `opacity-40`, `w-5 h-5 items-center justify-center`
- セット間 gap: `8px`（`gap-2`）

#### 「+ セットを追加」ボタン
- 背景・ボーダーなし、テキストリンクのみ
- `mt-2 py-2`, `14px`, `600`, `#4D94FF`

#### 「+ 種目を追加」ボタン
- `bg-white`, `border border-[#e2e8f0]`, `rounded-lg`, `mx-4 py-4`, `items-center`
- `15px`, `600`, `#4D94FF`

#### コンテナ
- `px-4 pt-2 pb-4`

### F-02: タブ構成変更（5タブ→4タブ）

#### 変更前
```
Home | Calendar | +(Record) | Stats | AI
```

#### 変更後
```
Home | Calendar | Stats | AI
```

- `RecordTab` を `MainTabParamList` から削除
- `RecordStack.tsx` を廃止
- `FloatingRecordButton` を削除
- `CustomTabBar` の中央ボタン特別処理を削除

### F-03: HomeScreen に記録開始エントリーポイント追加

#### 「本日のワークアウトを記録」ボタン
- 当日に記録中でも完了済みでも表示
- タップ時:
  - 記録中セッションあり → `HomeStack` の `RecordScreen` へ遷移（セッション復帰）
  - 当日完了済みあり → `RecordScreen(workoutId)` で継続（リアルタイム編集）
  - なし → `RecordScreen()` で新規

#### 「記録中」バナー
- `WorkoutRepository.findRecording()` で記録中セッションを検出
- バナー表示: 「ワークアウト記録中 → 再開」のような文言
- タップで `RecordScreen` へ遷移（セッション復帰）

### F-04: CalendarScreen に編集ボタン追加

- 日付選択時（既存・新規ともに）編集ボタンを表示
- 既存ワークアウトあり: `RecordScreen({ workoutId })`
- 既存ワークアウトなし: `RecordScreen({ targetDate })`（過去日付での新規作成）

### F-05: useWorkoutSession 編集モード対応

#### startSession シグネチャ拡張
```typescript
startSession(options?: {
  workoutId?: string;    // 既存ワークアウトをロードして編集
  targetDate?: string;   // 過去日付の新規作成
}): Promise<void>;
```

#### 動作
- `workoutId` あり: DB から既存ワークアウトをロード → Zustand store にセット → 以降リアルタイム保存
- `targetDate` あり & `workoutId` なし: 過去日付で新規ワークアウト作成
- 両方なし: 当日の新規 or 記録中セッション復帰（現在の動作）

#### `pendingContinuationWorkoutId` の廃止
- 直接 `workoutId` を params/options で渡せるため不要
- `workoutSessionStore` から削除

#### RecordScreen 初期化の変更
- `useFocusEffect` + `useRef` パターン → `useEffect` に変更（スタック遷移でアンマウントされるため）

### F-06: WorkoutDetailScreen の変更

- 「続きを記録」ボタン → 「編集」ボタンに変更
- `navigation.navigate('Record', { workoutId })` へ遷移

### F-07: WorkoutEditScreen の廃止

- `WorkoutEditScreen.tsx` を削除
- `HomeStackParamList.WorkoutEdit` および `CalendarStackParamList.WorkoutEdit` を削除
- 代わりに各スタックに `Record: { workoutId?: string; targetDate?: string }` を追加

## スコープ外（変更しない）

- WorkoutSummaryScreen（現状維持）
- ExercisePickerScreen（現状維持。HomeStack/CalendarStack に移動のみ）
- ExerciseHistoryScreen（現状維持。HomeStack/CalendarStack に移動のみ）
- TimerBar コンポーネント（記録・編集どちらでも表示）
- ワークアウト全体メモ（現状維持）
- 種目ごとのメモ欄（現状維持）

## 受け入れ基準

- [ ] RecordScreen の種目ブロックがカード形式（白背景・border・rounded）で表示される
- [ ] セット行にカラムヘッダー（Set/kg/回/1RM）が表示される
- [ ] セット行の枠線が廃止され、カード内にフラット表示される
- [ ] 入力フィールドが flex-1（均等幅）で表示される
- [ ] iPhone でテンキー（decimal-pad/number-pad）が開く
- [ ] 「+ セットを追加」がテキストリンクになっている
- [ ] 「+ 種目を追加」が白カード・グレーボーダーになっている
- [ ] タブバーが4タブ（Home/Calendar/Stats/AI）になっている
- [ ] ホーム画面に「本日のワークアウトを記録」ボタンが表示される
- [ ] 記録中は「記録中バナー」が表示されタップで復帰できる
- [ ] カレンダーで日付選択時に編集ボタンが表示される
- [ ] カレンダー編集ボタンから既存ワークアウトを編集できる（リアルタイム保存）
- [ ] カレンダー編集ボタンから過去日付の新規ワークアウトを作成できる
- [ ] WorkoutDetailScreen の「続きを記録」が「編集」ボタンに変わっている
- [ ] WorkoutEditScreen が廃止されている
- [ ] 編集モード時に前回記録バッジが非表示になっている
- [ ] すべてのテストが通る
