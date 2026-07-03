import { config } from "@invest-agent/config";
import {
  sortOpenPositions,
  sortRecentTrades,
  summarizeTradingPerformance,
  summarizeTradingPerformanceByAsset
} from "@invest-agent/portfolio-engine";
import { summarizeRiskOperations } from "@invest-agent/risk-engine";
import type { TradingOperationsSnapshot } from "@invest-agent/shared-types";
import {
  getAllOpenPositions,
  readOperationalAlerts,
  readRiskDecisions,
  readTradeLedger,
  readWorkerRuntimeSnapshot
} from "@invest-agent/utils";

export async function getOperationsSnapshot(): Promise<TradingOperationsSnapshot> {
  const [openPositions, trades, runtime, alerts, riskDecisions] = await Promise.all([
    getAllOpenPositions(),
    readTradeLedger(),
    readWorkerRuntimeSnapshot(),
    readOperationalAlerts(),
    readRiskDecisions()
  ]);

  return {
    generatedAt: Date.now(),
    mode: config.executionMode,
    capitalBase:
      config.executionMode === "test" ? config.trading.paperInitialCapitalUsdt : null,
    summary: summarizeTradingPerformance({
      mode: config.executionMode,
      capitalBase:
        config.executionMode === "test" ? config.trading.paperInitialCapitalUsdt : null,
      openPositions,
      trades
    }),
    risk: summarizeRiskOperations({
      openPositions,
      recentTrades: trades,
      alerts,
      capitalBase:
        config.executionMode === "test"
          ? config.trading.paperInitialCapitalUsdt
          : Math.max(
              openPositions.reduce(
                (sum, position) => sum + position.entryPrice * position.quantity,
                0
              ),
              1
            ),
      maxOpenTrades: config.risk.maxOpenTrades,
      maxPortfolioExposurePct: config.risk.maxPortfolioExposurePct,
      maxDailyLossPct: config.risk.maxDailyLossPct,
      cooldownMs: config.risk.cooldownMs,
      consecutiveLossLimit: config.risk.consecutiveLossLimit
    }),
    byAsset: summarizeTradingPerformanceByAsset(trades),
    openPositions: sortOpenPositions(openPositions),
    recentTrades: sortRecentTrades(trades).slice(0, 12),
    riskDecisions: riskDecisions.slice(0, 12),
    runtime,
    alerts: alerts.slice(0, 12)
  };
}
