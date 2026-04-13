import { calculateEMA } from "./indicators/ema";
import { calculateRSI } from "./indicators/rsi";
import {
  analyzeMultiTimeframeMarket,
  Candle,
  MarketAnalysis,
  MarketAnalysisInput,
  MarketAction,
  MarketTrend,
  StructuredReason,
  decideMarketAction
} from "./market-analysis";

export type {
  Candle,
  MarketAnalysis,
  MarketAnalysisInput,
  MarketAction,
  MarketTrend,
  StructuredReason
};
export { analyzeMultiTimeframeMarket, calculateEMA, calculateRSI, decideMarketAction };

export function generateSignalFromCandles(candles: Candle[]) {
  const closes = candles.map((c) => c.close);

  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const safeEma50 = ema50 ?? 0;
  const safeEma200 = ema200 ?? 0;
  const trendStrength = safeEma200 === 0 ? 0 : Math.abs(safeEma50 - safeEma200) / safeEma200;

  if (trendStrength < 0.002) {
    return {
      action: "HOLD" as const,
      confidence: 0.4,
      reason: `Weak trend | EMA50=${safeEma50.toFixed(2)} EMA200=${safeEma200.toFixed(2)} RSI=${rsi.toFixed(2)} TrendStrength=${trendStrength.toFixed(4)}`
    };
  }

  if (safeEma50 > safeEma200 && rsi < 30) {
    return {
      action: "BUY" as const,
      confidence: 0.85,
      reason: `Strong uptrend + deep RSI pullback | EMA50=${safeEma50.toFixed(2)} EMA200=${safeEma200.toFixed(2)} RSI=${rsi.toFixed(2)}`
    };
  }

  if (safeEma50 < safeEma200 && rsi > 70) {
    return {
      action: "SELL" as const,
      confidence: 0.85,
      reason: `Strong downtrend + RSI overheated | EMA50=${safeEma50.toFixed(2)} EMA200=${safeEma200.toFixed(2)} RSI=${rsi.toFixed(2)}`
    };
  }

  return {
    action: "HOLD" as const,
    confidence: 0.5,
    reason: `No strong signal | EMA50=${safeEma50.toFixed(2)} EMA200=${safeEma200.toFixed(2)} RSI=${rsi.toFixed(2)} TrendStrength=${trendStrength.toFixed(4)}`
  };
}
