import { ExecutionMode } from "@invest-agent/shared-types";

const VALID_MODES: ExecutionMode[] = ["simulation", "test", "live"];
const rawMode = process.env.EXECUTION_MODE ?? "simulation";
const executionMode = VALID_MODES.includes(rawMode as ExecutionMode)
  ? (rawMode as ExecutionMode)
  : "simulation";

export const config = {
  executionMode,

  trading: {
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    defaultSymbol: "BTCUSDT",
    tradeAmountUsdt: Number(process.env.TRADE_AMOUNT_USDT) || 50,
  },

  risk: {
    maxOpenTrades: Number(process.env.MAX_OPEN_TRADES) || 2,
    stopLossPct: Number(process.env.STOP_LOSS_PCT) || 0.03,
    takeProfitPct: Number(process.env.TAKE_PROFIT_PCT) || 0.05,
  },
};
