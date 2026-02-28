# ワークアウトドメイン ユビキタス言語

> このドキュメントはドメインモデルの定義を日本語で記述したものです。
> コードの実装は `apps/mobile/src/domain/workout/WorkoutPolicy.ts` を参照してください。

## セット（Set）
ユーザーが1種目に対して実施した1回分の記録。`weight`（重量 kg）と `reps`（回数）で構成される。

## 有効セット（Valid Set）
- `weight` が入力済み（null でない）
- `reps` が入力済み（null でない）かつ 1以上

**weight=0 は有効**（自重トレーニング）。**reps=0 は無効**（未実施扱い）。

## 有効種目（Valid Exercise）
有効セットを 1件以上持つ種目。有効セットが0件の種目は完了時に自動削除される。

## 有効ワークアウト（Valid Workout）
有効セットを 1件以上持つワークアウト。`status` は問わない。

## 記録中ワークアウト（Active Recording）
ホーム画面バナーの表示対象となるワークアウト。以下の条件をすべて満たす:
1. `status = 'recording'`
2. 本日（端末ローカル時刻）作成
3. 今回のセッションで追加された有効セットが 1件以上存在する

### 「今回のセッション」の判定
- **新規ワークアウト**（`completed_at IS NULL`）: すべての有効セットが対象
- **継続モード**（`completed_at IS NOT NULL`）: `sets.created_at > workouts.completed_at` のセットのみ対象

継続モードで RecordScreen を開いても何も追加せず戻った場合は Active Recording に該当しない。

## ワークアウトステータス（Workout Status）
| 値 | 意味 |
|---|---|
| `recording` | 記録中（セッション進行中） |
| `completed` | 完了済み |

## 継続モード（Continuation Mode）
完了済みワークアウトに種目・セットを追記する操作。
再オープン時にステータスが `completed → recording` に変わるが、`completed_at` は保持される（Active Recording 判定のための基準値として使用）。
