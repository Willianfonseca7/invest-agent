import type { MarketAction } from "./market";

export type TradingMode = "simulation" | "test" | "live";
export type WorkerStatus = "idle" | "running" | "stopped" | "error";

export type OpenPositionSnapshot = {
  symbol: string;
  side: "BUY";
  entryPrice: number;
  quantity: number;
  orderId: string;
  openedAt: number;
};

export type TradeLedgerEntry = {
  id: string;
  symbol: string;
  side: MarketAction;
  mode: TradingMode;
  trigger: string | null;
  orderId: string;
  executedPrice: number;
  quantity: number;
  quoteAmount: number;
  closedPosition: boolean;
  executedAt: number;
  realizedPnl: number | null;
  realizedPnlPct: number | null;
};

export type AssetPerformanceSummary = {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  tradedVolume: number;
};

export type TradingPerformanceSummary = {
  mode: TradingMode;
  tradeCount: number;
  completedTrades: number;
  openPositions: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  realizedPnlPct: number | null;
  tradedVolume: number;
  lastTradeAt: number | null;
};

export type OperationsOverview = {
  generatedAt: number;
  mode: TradingMode;
  capitalBase: number | null;
  summary: TradingPerformanceSummary;
  risk: RiskOperationsSummary;
  byAsset: AssetPerformanceSummary[];
  openPositions: OpenPositionSnapshot[];
  recentTrades: TradeLedgerEntry[];
  riskDecisions: RiskDecisionRecord[];
  runtime: WorkerRuntimeSnapshot | null;
  alerts: OperationalAlert[];
};

export type WorkerCycleSummary = {
  cycleId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  symbolsProcessed: number;
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  executedBuys: number;
  executedSells: number;
  riskBlockedCount: number;
  errorCount: number;
  lastError: string | null;
};

export type WorkerRuntimeSnapshot = {
  generatedAt: number;
  startedAt: number;
  uptimeMs: number;
  mode: TradingMode;
  status: WorkerStatus;
  intervalMs: number;
  totalCycles: number;
  skippedCycles: number;
  totalErrors: number;
  lastCycle: WorkerCycleSummary | null;
};

export type OperationalAlert = {
  id: string;
  severity: "info" | "warn" | "error";
  code:
    | "WORKER_CYCLE_SKIPPED"
    | "WORKER_CYCLE_ERROR"
    | "RISK_BLOCKED"
    | "STOP_LOSS_TRIGGERED"
    | "TAKE_PROFIT_TRIGGERED";
  message: string;
  source: "worker" | "api" | "system";
  symbol?: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type RiskOperationsSummary = {
  maxOpenTrades: number;
  remainingOpenTradeSlots: number;
  maxPortfolioExposurePct: number;
  currentExposurePct: number;
  maxDailyLossPct: number;
  dailyRealizedPnl: number;
  cooldownMs: number;
  cooldownActive: boolean;
  cooldownRemainingMs: number;
  consecutiveLossLimit: number;
  consecutiveLossCount: number;
  circuitBreakerActive: boolean;
  dailyLossLimitReached: boolean;
  lastRiskBlock: OperationalAlert | null;
};

export type RiskDecisionRecord = {
  id: string;
  symbol: string;
  status: "APPROVED" | "REDUCED" | "BLOCKED";
  code:
    | "APPROVED"
    | "POSITION_SIZE_REDUCED"
    | "MAX_OPEN_TRADES_REACHED"
    | "MAX_PORTFOLIO_EXPOSURE_REACHED"
    | "NO_AVAILABLE_CAPITAL"
    | "BELOW_MIN_ORDER_NOTIONAL"
    | "NO_REQUESTED_CAPITAL"
    | "DAILY_LOSS_LIMIT_REACHED"
    | "COOLDOWN_ACTIVE"
    | "CIRCUIT_BREAKER_ACTIVE";
  requestedCapital: number;
  approvedCapital: number;
  reason: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean | null>;
};
