/**
 * calculate1RM / calculateVolume ユニットテスト
 */
import { calculate1RM, calculateVolume } from '../calculate1RM';

describe('calculate1RM', () => {
  it('正常系: weight=100, reps=10 の場合 Epley式で 133.33 を返す', () => {
    const result = calculate1RM(100, 10);
    // 100 * (1 + 10/30) = 100 * 1.333... = 133.33
    expect(result).toBeCloseTo(133.33, 2);
  });

  it('正常系: weight=80, reps=5 の場合', () => {
    const result = calculate1RM(80, 5);
    // 80 * (1 + 5/30) = 80 * 1.1667 = 93.33
    expect(result).toBeCloseTo(93.33, 2);
  });

  it('reps=1の場合、weight自体を返す', () => {
    const result = calculate1RM(100, 1);
    expect(result).toBe(100);
  });

  it('weight=0の場合、0を返す', () => {
    const result = calculate1RM(0, 10);
    expect(result).toBe(0);
  });

  it('reps=0の場合、0を返す', () => {
    const result = calculate1RM(100, 0);
    expect(result).toBe(0);
  });

  it('weight=0, reps=0の場合、0を返す', () => {
    const result = calculate1RM(0, 0);
    expect(result).toBe(0);
  });

  it('負の値の場合、0を返す', () => {
    expect(calculate1RM(-10, 5)).toBe(0);
    expect(calculate1RM(10, -5)).toBe(0);
  });

  it('小数点の重量に対応する', () => {
    const result = calculate1RM(55.5, 4);
    // 55.5 * (1 + 4/30) = 55.5 * 1.1333... = 62.9
    expect(result).toBeCloseTo(62.9, 1);
  });
});

describe('calculateVolume', () => {
  it('正常系: 全セットのweight*repsの合計を返す', () => {
    const sets = [
      { weight: 80, reps: 10 },
      { weight: 85, reps: 8 },
      { weight: 90, reps: 6 },
    ];
    // 80*10 + 85*8 + 90*6 = 800 + 680 + 540 = 2020
    expect(calculateVolume(sets)).toBe(2020);
  });

  it('weight=nullのセットは無視する', () => {
    const sets = [
      { weight: 80, reps: 10 },
      { weight: null, reps: 8 },
    ];
    expect(calculateVolume(sets)).toBe(800);
  });

  it('reps=nullのセットは無視する', () => {
    const sets = [
      { weight: 80, reps: 10 },
      { weight: 85, reps: null },
    ];
    expect(calculateVolume(sets)).toBe(800);
  });

  it('空配列の場合は0を返す', () => {
    expect(calculateVolume([])).toBe(0);
  });

  it('全セットがnullの場合は0を返す', () => {
    const sets = [
      { weight: null, reps: null },
      { weight: null, reps: null },
    ];
    expect(calculateVolume(sets)).toBe(0);
  });

  it('weight=0のセットは無視する', () => {
    const sets = [
      { weight: 0, reps: 10 },
      { weight: 80, reps: 5 },
    ];
    expect(calculateVolume(sets)).toBe(400);
  });
});
