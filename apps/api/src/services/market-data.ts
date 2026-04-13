import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import {
  analyzeMultiTimeframeMarket,
  MarketAnalysis
} from "@invest-agent/strategy-engine";

const binance = new BinanceAdapter();

export async function getMarketOverview(symbol: string): Promise<MarketAnalysis> {
  const [candles5m, candles1h] = await Promise.all([
    binance.getCandles(symbol, "5m", 50),
    binance.getCandles(symbol, "1h", 250)
  ]);

  return analyzeMultiTimeframeMarket({
    symbol,
    candles5m,
    candles1h
  });
}
