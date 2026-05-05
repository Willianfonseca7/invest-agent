import http from "node:http";
import { analyzeMultiTimeframeMarket } from "@invest-agent/strategy-engine";
import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import { config } from "@invest-agent/config";
import {
  appendHistoryItem,
  getAllOpenPositions,
  getOpenPosition,
  removeOpenPosition,
  saveOpenPosition,
} from "@invest-agent/utils";

const PORT = Number(process.env.PORT) || 8080;
http
  .createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker", mode: config.executionMode }));
  })
  .listen(PORT);

const binance = new BinanceAdapter();

const IS_LIVE = config.executionMode === "live";
const STOP_LOSS = config.risk.stopLossPct;
const TAKE_PROFIT = config.risk.takeProfitPct;
const TRADE_AMOUNT = config.trading.tradeAmountUsdt;
const MAX_OPEN = config.risk.maxOpenTrades;

async function checkRiskLimits(): Promise<void> {
  const positions = await getAllOpenPositions();

  for (const position of positions) {
    const ticker = await binance.getTicker(position.symbol);
    const pnlPct = (ticker.price - position.entryPrice) / position.entryPrice;

    const shouldClose = pnlPct <= -STOP_LOSS || pnlPct >= TAKE_PROFIT;
    if (!shouldClose) continue;

    const trigger = pnlPct <= -STOP_LOSS ? "STOP_LOSS" : "TAKE_PROFIT";
    console.log(`[${position.symbol}] ${trigger} triggered | PnL: ${(pnlPct * 100).toFixed(2)}%`);

    const result = await binance.createMarketSell(position.symbol, position.quantity);
    await removeOpenPosition(position.symbol);
    console.log(`[${position.symbol}] Closed at ${result.executedPrice} | order: ${result.orderId}`);
  }
}

async function processSymbol(symbol: string): Promise<void> {
  const [candles5m, candles1h] = await Promise.all([
    binance.getCandles(symbol, "5m", 50),
    binance.getCandles(symbol, "1h", 250),
  ]);

  const signal = analyzeMultiTimeframeMarket({ symbol, candles5m, candles1h });

  await appendHistoryItem({
    symbol,
    price: signal.price,
    action: signal.action,
    confidence: signal.confidence,
    reason: signal.reason.summary,
    timestamp: Date.now(),
  });

  console.log(
    `[${symbol}] ${signal.action} | price: ${signal.price} | confidence: ${(signal.confidence * 100).toFixed(0)}%`
  );

  if (!IS_LIVE) return;

  const openPosition = await getOpenPosition(symbol);

  if (openPosition) {
    if (signal.action === "SELL") {
      const result = await binance.createMarketSell(symbol, openPosition.quantity);
      await removeOpenPosition(symbol);
      console.log(`[${symbol}] Sold (signal) at ${result.executedPrice} | order: ${result.orderId}`);
    }
    return;
  }

  if (signal.action !== "BUY") return;

  const openPositions = await getAllOpenPositions();
  if (openPositions.length >= MAX_OPEN) {
    console.log(`[${symbol}] Max open trades reached, skipping`);
    return;
  }

  const balance = await binance.getBalance("USDT");
  const amount = Math.min(TRADE_AMOUNT, balance);
  if (amount < 10) {
    console.log(`[${symbol}] Insufficient USDT balance: ${balance.toFixed(2)}`);
    return;
  }

  const order = await binance.createMarketBuy(symbol, amount);
  await saveOpenPosition({
    symbol,
    side: "BUY",
    entryPrice: order.executedPrice,
    quantity: order.quantity,
    orderId: order.orderId,
    openedAt: Date.now(),
  });
  console.log(
    `[${symbol}] Bought at ${order.executedPrice} | qty: ${order.quantity} | order: ${order.orderId}`
  );
}

async function runCycle(): Promise<void> {
  if (IS_LIVE) {
    await checkRiskLimits();
  }

  for (const symbol of config.trading.symbols) {
    try {
      await processSymbol(symbol);
    } catch (error) {
      console.error(`[${symbol}] Error:`, error instanceof Error ? error.message : error);
    }
  }
}

async function start(): Promise<void> {
  const intervalMs = Number(process.env.WORKER_INTERVAL_MS) || 60_000;

  console.log(`mode: ${config.executionMode} | interval: ${intervalMs}ms`);

  if (IS_LIVE) {
    console.log(
      `risk: SL=${(STOP_LOSS * 100).toFixed(0)}% | TP=${(TAKE_PROFIT * 100).toFixed(0)}% | maxTrades=${MAX_OPEN} | amount=${TRADE_AMOUNT}USDT`
    );
  }

  await runCycle();
  setInterval(runCycle, intervalMs);
}

start();
