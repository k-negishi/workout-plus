# Data Model: ワイヤーフレーム準拠 UI 実装

## 変更なし

本フィーチャーはビジュアル層のみの変更。既存のデータモデルは `specs/001-workout-core-screens/data-model.md` を参照。

DB スキーマ（`src/database/schema.ts`）・リポジトリ（`src/database/repositories/`）・Zustand ストア（`src/stores/`）への変更は一切行わない。

## ナビゲーション型の変更（唯一の構造的変更）

ビジュアル層の変更ではないが、ExerciseHistory エントリーポイント追加に伴い型定義ファイルを変更する。

**変更ファイル**: `src/types/navigation.ts`

```typescript
// 追加: MainTabParamList
AITab: undefined;

// 追加: HomeStackParamList
ExerciseHistory: { exerciseId: string; exerciseName: string };

// 追加: CalendarStackParamList
ExerciseHistory: { exerciseId: string; exerciseName: string };
```

`RecordStackParamList` の `ExerciseHistory` は既存のため変更なし。
