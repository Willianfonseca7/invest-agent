import { ExecutionMode } from "@invest-agent/shared-types";

const VALID_MODES: ExecutionMode[] = ["simulation", "test", "live"];
const rawMode = process.env.EXECUTION_MODE ?? "simulation";
if (rawMode === "live") {
  throw new Error("Live trading is disabled in the v2 MVP");
}
const executionMode = VALID_MODES.includes(rawMode as ExecutionMode)
  ? (rawMode as ExecutionMode)
  : "simulation";

function readOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const config = {
  executionMode,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  trading: {
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    defaultSymbol: "BTCUSDT",
    capitalAsset: process.env.CAPITAL_ASSET ?? "USDT",
    maxDeployableCapitalUsdt: readOptionalNumber(process.env.MAX_DEPLOYABLE_CAPITAL_USDT),
    paperInitialCapitalUsdt: readOptionalNumber(process.env.PAPER_INITIAL_CAPITAL_USDT) ?? 1000,
  },

  risk: {
    maxOpenTrades: Number(process.env.MAX_OPEN_TRADES) || 2,
    maxPositionSizePct: readOptionalNumber(process.env.MAX_POSITION_SIZE_PCT) ?? 1,
    maxPortfolioExposurePct:
      readOptionalNumber(process.env.MAX_PORTFOLIO_EXPOSURE_PCT) ?? 1,
    minOrderNotional: readOptionalNumber(process.env.MIN_ORDER_NOTIONAL) ?? 10,
    maxDailyLossPct: readOptionalNumber(process.env.MAX_DAILY_LOSS_PCT) ?? 0.05,
    cooldownMs: readOptionalNumber(process.env.RISK_COOLDOWN_MS) ?? 0,
    consecutiveLossLimit:
      readOptionalNumber(process.env.CONSECUTIVE_LOSS_LIMIT) ?? 0,
    stopLossPct: Number(process.env.STOP_LOSS_PCT) || 0.03,
    takeProfitPct: Number(process.env.TAKE_PROFIT_PCT) || 0.05,
  },
};
