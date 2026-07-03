import { describe, expect, it } from "vitest";
import {
  summarizeTradingPerformance,
  summarizeTradingPerformanceByAsset
} from "../services/pnl-service";

const openPositions = [
  {
    symbol: "ETHUSDT",
    side: "BUY" as const,
    entryPrice: 2000,
    quantity: 0.5,
    orderId: "open-1",
    openedAt: 10
  }
];

const trades = [
  {
    id: "2",
    symbol: "BTCUSDT",
    side: "SELL" as const,
    mode: "test" as const,
    trigger: "TAKE_PROFIT" as const,
    orderId: "sell-1",
    executedPrice: 26000,
    quantity: 0.01,
    quoteAmount: 260,
    closedPosition: true,
    executedAt: 20,
    realizedPnl: 10,
    realizedPnlPct: 0.04
  },
  {
    id: "1",
    symbol: "BTCUSDT",
    side: "BUY" as const,
    mode: "test" as const,
    trigger: "SIGNAL_BUY" as const,
    orderId: "buy-1",
    executedPrice: 25000,
    quantity: 0.01,
    quoteAmount: 250,
    closedPosition: false,
    executedAt: 10,
    realizedPnl: null,
    realizedPnlPct: null
  }
];

describe("summarizeTradingPerformance", () => {
  it("aggregates realized pnl, volume and win rate", () => {
    const summary = summarizeTradingPerformance({
      mode: "test",
      capitalBase: 1000,
      openPositions,
      trades
    });

    expect(summary).toEqual({
      mode: "test",
      tradeCount: 2,
      completedTrades: 1,
      openPositions: 1,
      wins: 1,
      losses: 0,
      winRate: 1,
      realizedPnl: 10,
      realizedPnlPct: 0.01,
      tradedVolume: 510,
      lastTradeAt: 20
    });
  });
});

describe("summarizeTradingPerformanceByAsset", () => {
  it("returns asset metrics sorted by realized pnl", () => {
    const byAsset = summarizeTradingPerformanceByAsset([
      ...trades,
      {
        id: "3",
        symbol: "ETHUSDT",
        side: "SELL" as const,
        mode: "test" as const,
        trigger: "STOP_LOSS" as const,
        orderId: "sell-2",
        executedPrice: 1900,
        quantity: 0.5,
        quoteAmount: 950,
        closedPosition: true,
        executedAt: 30,
        realizedPnl: -50,
        realizedPnlPct: -0.05
      }
    ]);

    expect(byAsset).toEqual([
      {
        symbol: "BTCUSDT",
        trades: 2,
        wins: 1,
        losses: 0,
        winRate: 1,
        realizedPnl: 10,
        tradedVolume: 510
      },
      {
        symbol: "ETHUSDT",
        trades: 1,
        wins: 0,
        losses: 1,
        winRate: 0,
        realizedPnl: -50,
        tradedVolume: 950
      }
    ]);
  });
});
