/**
 * WorkoutPolicy 単体テスト
 *
 * isValidSet のパラメタライズドテストは VALID_SET_SQL（workout.ts）との
 * 「同期契約」として機能する。VALID_SET_SQL を変更する場合は必ずこのテストも更新すること。
 */
import { WorkoutPolicy } from '../WorkoutPolicy';

describe('WorkoutPolicy.isValidSet — SQL VALID_SET_SQL との同期仕様', () => {
  // このテストケース群が SQL 条件と TypeScript 関数の「同期契約」として機能する。
  // VALID_SET_SQL を変更する場合、必ずここに対応するケースを追加し、
  // isValidSet も同様に更新すること。
  test.each([
    // --- 有効 ---
    [60, 10, true, '通常セット'],
    [0, 20, true, '自重トレーニング（weight=0 は有効）'],
    [60, 1, true, 'reps 最小値'],
    // --- 無効 ---
    [null, 10, false, 'weight が null'],
    [60, null, false, 'reps が null'],
    [null, null, false, '両方 null'],
    [60, 0, false, 'reps=0 は未実施'],
  ])('weight=%s reps=%s → %s（%s）', (weight, reps, expected) => {
    expect(
      WorkoutPolicy.isValidSet({ weight: weight as number | null, reps: reps as number | null }),
    ).toBe(expected);
  });
});

describe('WorkoutPolicy.isActiveRecording', () => {
  it('有効セットが存在するとき true', () => {
    expect(WorkoutPolicy.isActiveRecording(true)).toBe(true);
  });
  it('有効セットが存在しないとき false', () => {
    expect(WorkoutPolicy.isActiveRecording(false)).toBe(false);
  });
});
