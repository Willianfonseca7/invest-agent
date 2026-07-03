export type ExecutionMode = "simulation" | "test" | "live";
export type AssetSymbol = string;
export type ExecutionTrigger =
  | "SIGNAL_BUY"
  | "SIGNAL_SELL"
  | "STOP_LOSS"
  | "TAKE_PROFIT";

export type BotStatus = "idle" | "running" | "stopped" | "error";

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type Signal = {
  symbol: string;
  action: SignalAction;
  confidence: number;
  reason: string;
  timestamp: number;
};

export type OrderSide = "BUY" | "SELL";

export type Order = {
  symbol: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  status: "pending" | "filled" | "canceled" | "rejected";
  createdAt: number;
};

export type ExecutionOrderIntent =
  | {
      symbol: AssetSymbol;
      side: "BUY";
      quoteOrderQty: number;
      trigger?: ExecutionTrigger;
    }
  | {
      symbol: AssetSymbol;
      side: "SELL";
      quantity: number;
      trigger?: ExecutionTrigger;
    };

export type ExecutionResult = {
  symbol: AssetSymbol;
  side: OrderSide;
  mode: ExecutionMode;
  trigger: ExecutionTrigger | null;
  orderId: string;
  executedPrice: number;
  quantity: number;
  quoteAmount: number;
  closedPosition: boolean;
  executedAt: number;
  realizedPnl: number | null;
  realizedPnlPct: number | null;
};

export type MarketTicker = {
  symbol: string;
  price: number;
};

export type UnrealizedPnlSnapshot = {
  amount: number;
  percent: number;
};

export type PositionSnapshot = OpenPosition & {
  allocatedCapital: number;
  marketValue: number;
  exposure: number;
  unrealizedPnl: UnrealizedPnlSnapshot;
};

export type PositionValuation = {
  symbol: AssetSymbol;
  snapshot: PositionSnapshot;
};

export type CapitalSnapshot = {
  totalCapital: number;
  freeCash: number;
  reservedCash: number;
  availableCapital: number;
  allocatedCapital: number;
  exposure: number;
  unrealizedPnl: number;
  positions: PositionSnapshot[];
};

export type PortfolioState = {
  timestamp: number;
  capital: CapitalSnapshot;
  allocationPlan: AllocationPlan;
  openSymbols: AssetSymbol[];
};

export type RiskEvaluationInput = {
  symbol: AssetSymbol;
  requestedCapital: number;
  openPositionsCount: number;
  maxOpenTrades: number;
  maxPositionSizePct: number;
  maxPortfolioExposurePct: number;
  minOrderNotional: number;
  maxDailyLossPct: number;
  cooldownMs: number;
  consecutiveLossLimit: number;
  capital: CapitalSnapshot;
  recentTrades?: TradeLedgerEntry[];
  now?: number;
};

export type RiskEvaluationResult = {
  symbol: AssetSymbol;
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
  approvedCapital: number;
  requestedCapital: number;
  reason: string;
};

export type InvestmentPolicyInput = {
  eligibleSymbols: AssetSymbol[];
};

export type AllocationTarget = {
  symbol: AssetSymbol;
  weight: number;
};

export type AssetBudget = {
  symbol: AssetSymbol;
  weight: number;
  budget: number;
};

export type AllocationPlan = {
  policyName: string;
  totalCapital: number;
  allocatedCapital: number;
  unallocatedCapital: number;
  budgets: AssetBudget[];
  generatedAt: number;
};

export type SignalHistoryItem = {
  symbol: string;
  price: number;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reason: string;
  timestamp: number;
};

export type OpenPosition = {
  symbol: string;
  side: "BUY";
  entryPrice: number;
  quantity: number;
  orderId: string;
  openedAt: number;
};

export type TradeLedgerEntry = {
  id: string;
  symbol: AssetSymbol;
  side: OrderSide;
  mode: ExecutionMode;
  trigger: ExecutionTrigger | null;
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
  symbol: AssetSymbol;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  tradedVolume: number;
};

export type TradingPerformanceSummary = {
  mode: ExecutionMode;
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

export type TradingOperationsSnapshot = {
  generatedAt: number;
  mode: ExecutionMode;
  capitalBase: number | null;
  summary: TradingPerformanceSummary;
  risk: RiskOperationsSummary;
  byAsset: AssetPerformanceSummary[];
  openPositions: OpenPosition[];
  recentTrades: TradeLedgerEntry[];
  riskDecisions: RiskDecisionRecord[];
  runtime: WorkerRuntimeSnapshot | null;
  alerts: OperationalAlert[];
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
  symbol: AssetSymbol;
  status: "APPROVED" | "REDUCED" | "BLOCKED";
  code: RiskEvaluationResult["code"];
  requestedCapital: number;
  approvedCapital: number;
  reason: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean | null>;
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
  mode: ExecutionMode;
  status: BotStatus;
  intervalMs: number;
  totalCycles: number;
  skippedCycles: number;
  totalErrors: number;
  lastCycle: WorkerCycleSummary | null;
};

export type OperationalAlertSeverity = "info" | "warn" | "error";

export type OperationalAlertCode =
  | "WORKER_CYCLE_SKIPPED"
  | "WORKER_CYCLE_ERROR"
  | "RISK_BLOCKED"
  | "STOP_LOSS_TRIGGERED"
  | "TAKE_PROFIT_TRIGGERED";

export type OperationalAlert = {
  id: string;
  severity: OperationalAlertSeverity;
  code: OperationalAlertCode;
  message: string;
  source: "worker" | "api" | "system";
  symbol?: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean | null>;
};
