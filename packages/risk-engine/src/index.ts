import type {
  CapitalSnapshot,
  OperationalAlert,
  OpenPosition,
  RiskEvaluationInput,
  RiskEvaluationResult,
  RiskOperationsSummary,
  TradeLedgerEntry
} from "@invest-agent/shared-types";
import { hasReachedMaxOpenTrades } from "./rules/maxOpenTradesRule";
import {
  getConsecutiveLossCount,
  getCooldownRemainingMs,
  getDailyRealizedPnl,
  hasReachedDailyLossLimit,
  isCircuitBreakerActive,
  isCooldownActive
} from "./rules/maxDailyLossRule";
import {
  getPerTradeCapitalCap,
  getPortfolioExposureHeadroom
} from "./rules/maxPositionSizeRule";

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function createBlockedResult(
  input: RiskEvaluationInput,
  code: RiskEvaluationResult["code"],
  reason: string
): RiskEvaluationResult {
  return {
    symbol: input.symbol,
    status: "BLOCKED",
    code,
    approvedCapital: 0,
    requestedCapital: roundCurrency(input.requestedCapital),
    reason
  };
}

export function evaluateRisk(input: RiskEvaluationInput): RiskEvaluationResult {
  const requestedCapital = roundCurrency(input.requestedCapital);
  const recentTrades = input.recentTrades ?? [];
  const now = input.now ?? Date.now();

  if (requestedCapital <= 0) {
    return createBlockedResult(input, "NO_REQUESTED_CAPITAL", "No capital requested for execution.");
  }

  if (hasReachedMaxOpenTrades(input.openPositionsCount, input.maxOpenTrades)) {
    return createBlockedResult(
      input,
      "MAX_OPEN_TRADES_REACHED",
      "Max open trades limit reached."
    );
  }

  if (
    hasReachedDailyLossLimit({
      trades: recentTrades,
      now,
      capitalBase: input.capital.totalCapital,
      maxDailyLossPct: input.maxDailyLossPct
    })
  ) {
    return createBlockedResult(
      input,
      "DAILY_LOSS_LIMIT_REACHED",
      "Daily realized loss limit reached."
    );
  }

  if (
    isCooldownActive({
      trades: recentTrades,
      now,
      cooldownMs: input.cooldownMs
    })
  ) {
    return createBlockedResult(
      input,
      "COOLDOWN_ACTIVE",
      "Risk cooldown active after the latest realized loss."
    );
  }

  if (
    isCircuitBreakerActive({
      trades: recentTrades,
      consecutiveLossLimit: input.consecutiveLossLimit
    })
  ) {
    return createBlockedResult(
      input,
      "CIRCUIT_BREAKER_ACTIVE",
      "Consecutive loss circuit breaker active."
    );
  }

  if (input.capital.availableCapital <= 0) {
    return createBlockedResult(
      input,
      "NO_AVAILABLE_CAPITAL",
      "No available capital for a new position."
    );
  }

  const perTradeCapFromCapital = getPerTradeCapitalCap(
    input.capital,
    input.maxPositionSizePct
  );
  const portfolioExposureHeadroom = getPortfolioExposureHeadroom(
    input.capital,
    input.maxPortfolioExposurePct
  );

  if (portfolioExposureHeadroom <= 0) {
    return createBlockedResult(
      input,
      "MAX_PORTFOLIO_EXPOSURE_REACHED",
      "Max portfolio exposure limit reached."
    );
  }

  const approvedCapital = roundCurrency(
    Math.min(
      requestedCapital,
      input.capital.availableCapital,
      perTradeCapFromCapital,
      portfolioExposureHeadroom
    )
  );

  if (approvedCapital < input.minOrderNotional) {
    return createBlockedResult(
      input,
      "BELOW_MIN_ORDER_NOTIONAL",
      `Approved capital below minimum order notional of ${input.minOrderNotional.toFixed(2)}.`
    );
  }

  if (approvedCapital < requestedCapital) {
    return {
      symbol: input.symbol,
      status: "REDUCED",
      code: "POSITION_SIZE_REDUCED",
      approvedCapital,
      requestedCapital,
      reason: "Risk constraints reduced the requested capital."
    };
  }

  return {
    symbol: input.symbol,
    status: "APPROVED",
    code: "APPROVED",
    approvedCapital,
    requestedCapital,
    reason: "Risk constraints approved the requested capital."
  };
}

export class RiskManager {
  evaluate(input: RiskEvaluationInput): RiskEvaluationResult {
    return evaluateRisk(input);
  }
}

export function summarizeCapitalForRisk(capital: CapitalSnapshot): string {
  return `total=${capital.totalCapital.toFixed(2)} available=${capital.availableCapital.toFixed(2)} exposure=${capital.exposure.toFixed(2)} allocated=${capital.allocatedCapital.toFixed(2)}`;
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function getApproximateExposure(openPositions: OpenPosition[]): number {
  return roundCurrency(
    openPositions.reduce(
      (sum, position) => sum + position.entryPrice * position.quantity,
      0
    )
  );
}

export function summarizeRiskOperations(input: {
  openPositions: OpenPosition[];
  recentTrades: TradeLedgerEntry[];
  alerts: OperationalAlert[];
  now?: number;
  capitalBase: number;
  maxOpenTrades: number;
  maxPortfolioExposurePct: number;
  maxDailyLossPct: number;
  cooldownMs: number;
  consecutiveLossLimit: number;
}): RiskOperationsSummary {
  const now = input.now ?? Date.now();
  const currentExposure = getApproximateExposure(input.openPositions);
  const currentExposurePct =
    input.capitalBase > 0 ? roundRatio(currentExposure / input.capitalBase) : 0;
  const dailyRealizedPnl = roundCurrency(
    getDailyRealizedPnl(input.recentTrades, now)
  );
  const dailyLossLimitReached = hasReachedDailyLossLimit({
    trades: input.recentTrades,
    now,
    capitalBase: input.capitalBase,
    maxDailyLossPct: input.maxDailyLossPct
  });
  const cooldownActive = isCooldownActive({
    trades: input.recentTrades,
    now,
    cooldownMs: input.cooldownMs
  });
  const cooldownRemainingMs = getCooldownRemainingMs({
    trades: input.recentTrades,
    now,
    cooldownMs: input.cooldownMs
  });
  const consecutiveLossCount = getConsecutiveLossCount(input.recentTrades);
  const circuitBreakerActive = isCircuitBreakerActive({
    trades: input.recentTrades,
    consecutiveLossLimit: input.consecutiveLossLimit
  });
  const lastRiskBlock =
    input.alerts.find((alert) => alert.code === "RISK_BLOCKED") ?? null;

  return {
    maxOpenTrades: input.maxOpenTrades,
    remainingOpenTradeSlots: Math.max(
      input.maxOpenTrades - input.openPositions.length,
      0
    ),
    maxPortfolioExposurePct: input.maxPortfolioExposurePct,
    currentExposurePct,
    maxDailyLossPct: input.maxDailyLossPct,
    dailyRealizedPnl,
    cooldownMs: input.cooldownMs,
    cooldownActive,
    cooldownRemainingMs,
    consecutiveLossLimit: input.consecutiveLossLimit,
    consecutiveLossCount,
    circuitBreakerActive,
    dailyLossLimitReached,
    lastRiskBlock
  };
}
