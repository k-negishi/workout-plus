---
paths:
  - "apps/mobile/src/**/*.{ts,tsx}"
---

# コメント規約（Google Style Guide 準拠・日本語）

## 基本方針

- **コメントは日本語で書く**
- 「何をしているか」ではなく「**なぜそうしているか**」を説明する
- 自明なコードにコメントは不要

## JSDoc コメント（公開 API・関数・コンポーネント）

```typescript
/**
 * ワークアウトセッションの合計ボリュームを計算する。
 *
 * ボリューム = 重量 × レップ数 の全セット合計。
 * 単位変換は行わず、入力値の単位系をそのまま使用する。
 *
 * @param sets - セットの配列。各セットは weight と reps を持つ
 * @returns 合計ボリューム（kg または lb）
 */
function calculateVolume(sets: WorkoutSet[]): number { ... }

/**
 * ワークアウト中のセット入力行コンポーネント。
 *
 * 前回の記録をグレーでインライン表示し、ユーザーの入力を促す。
 * TextInput の onChangeText は debounce せず即時反映する（UX 優先）。
 */
const SetInputRow: React.FC<SetInputRowProps> = ({ ... }) => { ... }
```

## インラインコメント

```typescript
// NG: 何をしているかの説明（自明）
const total = weight * reps; // 重量とレップを掛ける

// OK: なぜそうしているかの説明
// Android では KeyboardAvoidingView の behavior が iOS と異なるため分岐
const behavior = Platform.OS === 'ios' ? 'padding' : 'height';
```

## TODO / FIXME

```typescript
// TODO(Kei): パフォーマンス改善 - FlatList のキーが頻繁に変わり再レンダーが多い
// FIXME: Android 13 以下で Modal のアニメーションがカクつく (#42)
```
