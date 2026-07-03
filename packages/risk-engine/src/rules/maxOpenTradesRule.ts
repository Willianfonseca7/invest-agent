export function hasReachedMaxOpenTrades(
  openPositionsCount: number,
  maxOpenTrades: number
): boolean {
  return maxOpenTrades > 0 && openPositionsCount >= maxOpenTrades;
}
