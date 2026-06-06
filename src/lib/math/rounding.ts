export function roundStock(value: number): number {
  return Math.max(0, Math.round(value));
}

export function roundPrice(poishaValue: number): number {
  const base = Math.round(poishaValue / 1000) * 1000;
  return Math.max(100, base);
}
