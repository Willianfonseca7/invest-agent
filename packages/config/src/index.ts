import { ExecutionMode } from "@invest-agent/shared-types";

export const config = {
  executionMode: "simulation" as ExecutionMode,

  trading: {
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    defaultSymbol: "BTCUSDT",
    tradeAmount: 50
  },

  risk: {
    maxOpenTrades: 2,
    maxDailyLoss: 100,
    maxTradeLoss: 20
  }
};