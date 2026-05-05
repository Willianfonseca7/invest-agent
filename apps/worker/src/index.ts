import { analyzeMultiTimeframeMarket } from "@invest-agent/strategy-engine";
import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import { config } from "@invest-agent/config";
import { appendHistoryItem } from "@invest-agent/utils";

const binance = new BinanceAdapter();

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

async function runBot() {
  console.log("🤖 Bot iniciado em modo:", config.executionMode);

  const intervalMs = Number(process.env.WORKER_INTERVAL_MS) || 60_000;

  setInterval(async () => {
    console.log("\n========================");

    for (const symbol of SYMBOLS) {
      try {
        const [candles5m, candles1h] = await Promise.all([
          binance.getCandles(symbol, "5m", 50),
          binance.getCandles(symbol, "1h", 250)
        ]);
        const signal = analyzeMultiTimeframeMarket({
          symbol,
          candles5m,
          candles1h
        });

        await appendHistoryItem({
          symbol,
          price: signal.price,
          action: signal.action,
          confidence: signal.confidence,
          reason: signal.reason.summary,
          timestamp: Date.now()
        });

        console.log(`📊 ${symbol}`);
        console.log(`Preço: ${signal.price}`);
        console.log(`Trend 4H: ${signal.trend4H}`);
        console.log(`RSI 5m: ${signal.rsi5m}`);
        console.log(`RSI 1h: ${signal.rsi1h}`);
        console.log(`Ação: ${signal.action}`);
        console.log(`Confiança: ${signal.confidence}`);
        console.log(`Motivo: ${signal.reason.summary}`);
      } catch (error) {
        console.error(`Erro em ${symbol}:`, error);
      }
    }
  }, intervalMs);
}

runBot();
