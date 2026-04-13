export function calculateEMA(prices: number[], period: number): number | null {
  if (!Array.isArray(prices) || prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  for (let index = period; index < prices.length; index += 1) {
    ema = (prices[index] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}
