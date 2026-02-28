/**
 * WorkoutPolicy - ワークアウトドメインのビジネスルール定義
 *
 * Evans の DDD 用語では Specification パターンに相当する。
 * 将来的にルールが増えた場合のために Policy という名前で集約している。
 *
 * ## ユビキタス言語
 *
 * ### 有効セット（Valid Set）
 * weight != null かつ reps != null かつ reps > 0 のセット。
 * weight=0 は自重トレーニングとして有効。reps=0 は未実施のため無効。
 *
 * ### 有効種目（Valid Exercise）
 * 有効セットが1件以上存在する種目。
 *
 * ### 記録中ワークアウト（Active Recording）
 * 今回のセッションで有効セットが追加済みの recording ワークアウト。
 * DB クエリによる判定は WorkoutRepository.findTodayActiveRecording() が担う。
 * このメソッドは「DB から取得した結果」を受け取ってドメインルールを適用する。
 *
 * ## SQL との対応
 * isValidSet() の論理的等価な SQL 条件は repository 層（workout.ts）の
 * VALID_SET_SQL 定数に定義する。ドメイン層はインフラ（SQL）を知らない。
 * 同期契約: WorkoutPolicy.test.ts のパラメタライズドテストが仕様書として機能する。
 */
export const WorkoutPolicy = {
  /**
   * セットが有効かどうかを判定する（Valid Set の仕様）。
   * weight=0 は自重トレーニング（有効）、reps=0 は未実施（無効）として扱う。
   *
   * SQL 等価条件: VALID_SET_SQL（workout.ts）と同期すること。
   */
  isValidSet(set: { weight: number | null; reps: number | null }): boolean {
    return set.weight != null && set.reps != null && set.reps > 0;
  },

  /**
   * ホーム画面バナーを表示すべきか判定する（Active Recording の仕様）。
   * DB クエリ（findTodayActiveRecording）が「今回セッションで有効セットが存在するか」を
   * 判定した結果を受け取り、ドメインルールとして意味を与える。
   */
  isActiveRecording(hasNewValidSets: boolean): boolean {
    return hasNewValidSets;
  },
} as const;
