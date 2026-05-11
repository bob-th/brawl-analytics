export const CHART_FONT = '"Google Sans Code", monospace';

export const COLOR_WIN = '#22c55e';
export const COLOR_LOSS = '#ef4444';
export const COLOR_NEUTRAL = '#52525b';
export const COLOR_DRAW = '#52525b';

export function colorForChange(change: number): string {
  if (change > 0) return COLOR_WIN;
  if (change < 0) return COLOR_LOSS;
  return COLOR_NEUTRAL;
}

export function niceTenInterval(range: number): number {
  if (range <= 0) return 10;
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const target = range / 6;
  return candidates.find((c) => c >= target) ?? candidates[candidates.length - 1];
}

export function rangeOf(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}
