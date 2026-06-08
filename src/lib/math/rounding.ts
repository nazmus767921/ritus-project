export function roundStock(value: number): number {
  if (value < 0) {
    throw new Error('Quantity cannot be negative.');
  }
  return Math.round(value);
}

export function roundPrice(poishaValue: number): number {
  const base = Math.round(poishaValue / 1000) * 1000;
  return Math.max(100, base);
}

export function formatCurrency(amountInPoisha: number): string {
  const taka = Math.round(amountInPoisha / 100);
  const abs = Math.abs(taka);
  return taka < 0 ? `৳-${abs}` : `৳${abs}`;
}
