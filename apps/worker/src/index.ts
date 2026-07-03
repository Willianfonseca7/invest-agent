import http from "node:http";
import { createAllocationPlan } from "@invest-agent/allocation-manager";
import { buildCapitalSnapshot } from "@invest-agent/capital-engine";
import { ExecutionLayer } from "@invest-agent/execution-layer";
import { analyzeMultiTimeframeMarket } from "@invest-agent/strategy-engine";
import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import { config } from "@invest-agent/config";
import { equalWeightInvestmentPolicy } from "@invest-agent/investment-policy";
import {
  buildPortfolioState,
  getPortfolioBudget,
  summarizeTradingPerformance,
  summarizePortfolioState
} from "@invest-agent/portfolio-engine";
import { evaluateRisk, summarizeCapitalForRisk } from "@invest-agent/risk-engine";
import type {
  BotStatus,
  OpenPosition,
  PortfolioState,
  SignalAction,
  WorkerCycleSummary,
  WorkerRuntimeSnapshot
} from "@invest-agent/shared-types";
import {
  appendOperationalAlert,
  appendHistoryItem,
  appendRiskDecision,
  getAllOpenPositions,
  getOpenPosition,
  logger,
  readTradeLedger,
  writeWorkerRuntimeSnapshot
} from "@invest-agent/utils";

const PORT = Number(process.env.PORT) || 8080;
http
  .createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker", mode: config.executionMode }));
  })
  .listen(PORT);

const binance = new BinanceAdapter();
const executionLayer = new ExecutionLayer(binance, config.executionMode);

const IS_LIVE = config.executionMode === "live";
const IS_PAPER = config.executionMode === "test";
const SHOULD_EXECUTE = IS_LIVE || IS_PAPER;
const STOP_LOSS = config.risk.stopLossPct;
const TAKE_PROFIT = config.risk.takeProfitPct;
const MAX_OPEN = config.risk.maxOpenTrades;
const CAPITAL_ASSET = config.trading.capitalAsset;
const MAX_POSITION_SIZE_PCT = config.risk.maxPositionSizePct;
const MAX_PORTFOLIO_EXPOSURE_PCT = config.risk.maxPortfolioExposurePct;
const MIN_ORDER_NOTIONAL = config.risk.minOrderNotional;
const MAX_DAILY_LOSS_PCT = config.risk.maxDailyLossPct;
const RISK_COOLDOWN_MS = config.risk.cooldownMs;
const CONSECUTIVE_LOSS_LIMIT = config.risk.consecutiveLossLimit;
const PAPER_INITIAL_CAPITAL = config.trading.paperInitialCapitalUsdt;
const WORKER_STARTED_AT = Date.now();

type RuntimeCapitalContext = {
  portfolio: PortfolioState;
};

type SymbolProcessingResult = {
  signalAction: SignalAction;
  executedBuy: boolean;
  executedSell: boolean;
  riskBlocked: boolean;
};

type CycleAccumulator = {
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  executedBuys: number;
  executedSells: number;
  riskBlockedCount: number;
  errorCount: number;
  lastError: string | null;
};

async function createOperationalAlert(input: {
  severity: "info" | "warn" | "error";
  code:
    | "WORKER_CYCLE_SKIPPED"
    | "WORKER_CYCLE_ERROR"
    | "RISK_BLOCKED"
    | "STOP_LOSS_TRIGGERED"
    | "TAKE_PROFIT_TRIGGERED";
  message: string;
  symbol?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await appendOperationalAlert({
    id: `${input.code}:${input.symbol ?? "global"}:${Date.now()}`,
    severity: input.severity,
    code: input.code,
    message: input.message,
    source: "worker",
    symbol: input.symbol,
    timestamp: Date.now(),
    metadata: input.metadata
  });
}

let workerStatus: BotStatus = "idle";
let totalCycles = 0;
let skippedCycles = 0;
let totalErrors = 0;
let isCycleRunning = false;
let lastCycle: WorkerCycleSummary | null = null;
let workerIntervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 60_000);

function getSymbolsEligibleForAllocation(openPositions: OpenPosition[]): string[] {
  const openSymbols = new Set(openPositions.map((position) => position.symbol));
  return config.trading.symbols.filter((symbol) => !openSymbols.has(symbol));
}

async function getExecutionFreeCash(openPositions: OpenPosition[]): Promise<number> {
  if (IS_LIVE) {
    return binance.getBalance(CAPITAL_ASSET);
  }

  const trades = await readTradeLedger();
  const realizedPnl = trades.reduce((sum, trade) => sum + (trade.realizedPnl ?? 0), 0);
  const allocatedCapital = openPositions.reduce(
    (sum, position) => sum + position.entryPrice * position.quantity,
    0
  );

  return Number((PAPER_INITIAL_CAPITAL + realizedPnl - allocatedCapital).toFixed(2));
}

async function buildRuntimeCapitalContext(
  openPositions: OpenPosition[]
): Promise<RuntimeCapitalContext> {
  const freeCash = await getExecutionFreeCash(openPositions);
  const markPrices = Object.fromEntries(
    await Promise.all(
      openPositions.map(async (position) => {
        const ticker = await binance.getTicker(position.symbol);
        return [position.symbol, ticker.price];
      })
    )
  );
  const capitalSnapshot = buildCapitalSnapshot({
    freeCash,
    positions: openPositions,
    markPrices
  });
  const deployableCapital =
    config.trading.maxDeployableCapitalUsdt === null
      ? capitalSnapshot.availableCapital
      : Math.min(capitalSnapshot.availableCapital, config.trading.maxDeployableCapitalUsdt);

  logger.info("capital snapshot", {
    mode: config.executionMode,
    asset: CAPITAL_ASSET,
    summary: summarizeCapitalForRisk(capitalSnapshot),
    unrealizedPnl: capitalSnapshot.unrealizedPnl
  });

  const allocationPlan = createAllocationPlan({
    totalCapital: deployableCapital,
    eligibleSymbols: getSymbolsEligibleForAllocation(openPositions),
    policy: equalWeightInvestmentPolicy,
  });
  const portfolio = buildPortfolioState({
    capital: capitalSnapshot,
    allocationPlan
  });

  logger.info("portfolio snapshot", {
    mode: config.executionMode,
    asset: CAPITAL_ASSET,
    summary: summarizePortfolioState(portfolio)
  });

  if (IS_PAPER) {
    const trades = await readTradeLedger();
    const performance = summarizeTradingPerformance({
      mode: config.executionMode,
      capitalBase: PAPER_INITIAL_CAPITAL,
      openPositions,
      trades
    });

    logger.info("paper performance", {
      asset: CAPITAL_ASSET,
      realizedPnl: performance.realizedPnl,
      winRate: performance.winRate,
      completedTrades: performance.completedTrades
    });
  }

  return {
    portfolio
  };
}

async function persistWorkerRuntimeSnapshot(): Promise<void> {
  const snapshot: WorkerRuntimeSnapshot = {
    generatedAt: Date.now(),
    startedAt: WORKER_STARTED_AT,
    uptimeMs: Date.now() - WORKER_STARTED_AT,
    mode: config.executionMode,
    status: workerStatus,
    intervalMs: workerIntervalMs,
    totalCycles,
    skippedCycles,
    totalErrors,
    lastCycle
  };

  await writeWorkerRuntimeSnapshot(snapshot);
}

function updateCycleAccumulator(
  accumulator: CycleAccumulator,
  result: SymbolProcessingResult
): void {
  if (result.signalAction === "BUY") {
    accumulator.buySignals += 1;
  } else if (result.signalAction === "SELL") {
    accumulator.sellSignals += 1;
  } else {
    accumulator.holdSignals += 1;
  }

  if (result.executedBuy) {
    accumulator.executedBuys += 1;
  }

  if (result.executedSell) {
    accumulator.executedSells += 1;
  }

  if (result.riskBlocked) {
    accumulator.riskBlockedCount += 1;
  }
}

async function checkRiskLimits(): Promise<number> {
  const positions = await getAllOpenPositions();
  let executedSells = 0;

  for (const position of positions) {
    const ticker = await binance.getTicker(position.symbol);
    const pnlPct = (ticker.price - position.entryPrice) / position.entryPrice;

    const shouldClose = pnlPct <= -STOP_LOSS || pnlPct >= TAKE_PROFIT;
    if (!shouldClose) continue;

    const trigger = pnlPct <= -STOP_LOSS ? "STOP_LOSS" : "TAKE_PROFIT";
    logger.warn("risk exit triggered", {
      symbol: position.symbol,
      trigger,
      pnlPct: Number((pnlPct * 100).toFixed(2))
    });
    await createOperationalAlert({
      severity: trigger === "STOP_LOSS" ? "error" : "info",
      code: trigger === "STOP_LOSS" ? "STOP_LOSS_TRIGGERED" : "TAKE_PROFIT_TRIGGERED",
      message: `${position.symbol} closed by ${trigger}.`,
      symbol: position.symbol,
      metadata: {
        pnlPct: Number((pnlPct * 100).toFixed(2))
      }
    });

    const result = await executionLayer.execute({
      symbol: position.symbol,
      side: "SELL",
      quantity: position.quantity,
      trigger
    });
    logger.info("position closed by risk rule", {
      symbol: position.symbol,
      orderId: result.orderId,
      executedPrice: result.executedPrice,
      realizedPnl: result.realizedPnl
    });
    executedSells += 1;
  }

  return executedSells;
}

async function processSymbol(
  symbol: string,
  capitalContext: RuntimeCapitalContext,
  openPositionsCount: number
): Promise<SymbolProcessingResult> {
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

  logger.info("signal evaluated", {
    symbol,
    action: signal.action,
    price: signal.price,
    confidence: Number((signal.confidence * 100).toFixed(0))
  });

  if (!SHOULD_EXECUTE) {
    return {
      signalAction: signal.action,
      executedBuy: false,
      executedSell: false,
      riskBlocked: false
    };
  }

  const openPosition = await getOpenPosition(symbol);

  if (openPosition) {
    if (signal.action === "SELL") {
      const result = await executionLayer.execute({
        symbol,
        side: "SELL",
        quantity: openPosition.quantity,
        trigger: "SIGNAL_SELL"
      });
      logger.info("position closed by sell signal", {
        symbol,
        orderId: result.orderId,
        executedPrice: result.executedPrice,
        realizedPnl: result.realizedPnl
      });
      return {
        signalAction: signal.action,
        executedBuy: false,
        executedSell: true,
        riskBlocked: false
      };
    }
    return {
      signalAction: signal.action,
      executedBuy: false,
      executedSell: false,
      riskBlocked: false
    };
  }

  if (signal.action !== "BUY") {
    return {
      signalAction: signal.action,
      executedBuy: false,
      executedSell: false,
      riskBlocked: false
    };
  }

  const budgetEntry = getPortfolioBudget(capitalContext.portfolio, symbol);
  const budget = budgetEntry?.budget ?? 0;
  if (budget <= 0) {
    logger.info("allocation budget unavailable", {
      symbol
    });
    return {
      signalAction: signal.action,
      executedBuy: false,
      executedSell: false,
      riskBlocked: false
    };
  }

  const riskResult = evaluateRisk({
    symbol,
    requestedCapital: budget,
    openPositionsCount,
    maxOpenTrades: MAX_OPEN,
    maxPositionSizePct: MAX_POSITION_SIZE_PCT,
    maxPortfolioExposurePct: MAX_PORTFOLIO_EXPOSURE_PCT,
    minOrderNotional: MIN_ORDER_NOTIONAL,
    maxDailyLossPct: MAX_DAILY_LOSS_PCT,
    cooldownMs: RISK_COOLDOWN_MS,
    consecutiveLossLimit: CONSECUTIVE_LOSS_LIMIT,
    capital: capitalContext.portfolio.capital,
    recentTrades: await readTradeLedger(),
    now: Date.now()
  });

  await appendRiskDecision({
    id: `${symbol}:${riskResult.code}:${Date.now()}`,
    symbol,
    status: riskResult.status,
    code: riskResult.code,
    requestedCapital: riskResult.requestedCapital,
    approvedCapital: riskResult.approvedCapital,
    reason: riskResult.reason,
    timestamp: Date.now(),
    metadata: {
      openPositionsCount,
      maxOpenTrades: MAX_OPEN,
      maxPositionSizePct: MAX_POSITION_SIZE_PCT,
      maxPortfolioExposurePct: MAX_PORTFOLIO_EXPOSURE_PCT,
      maxDailyLossPct: MAX_DAILY_LOSS_PCT
    }
  });

  if (riskResult.status === "BLOCKED") {
    logger.warn("execution blocked by risk", {
      symbol,
      code: riskResult.code,
      reason: riskResult.reason
    });
    await createOperationalAlert({
      severity: "warn",
      code: "RISK_BLOCKED",
      message: `${symbol} blocked by risk: ${riskResult.code}.`,
      symbol,
      metadata: {
        requestedCapital: riskResult.requestedCapital,
        approvedCapital: riskResult.approvedCapital
      }
    });
    return {
      signalAction: signal.action,
      executedBuy: false,
      executedSell: false,
      riskBlocked: true
    };
  }

  const amount = riskResult.approvedCapital;
  if (riskResult.status === "REDUCED") {
    logger.warn("capital reduced by risk", {
      symbol,
      requestedCapital: riskResult.requestedCapital,
      approvedCapital: riskResult.approvedCapital
    });
  }

  const order = await executionLayer.execute({
    symbol,
    side: "BUY",
    quoteOrderQty: amount,
    trigger: "SIGNAL_BUY"
  });
  logger.info("position opened", {
    symbol,
    orderId: order.orderId,
    executedPrice: order.executedPrice,
    quantity: order.quantity,
    quoteAmount: order.quoteAmount
  });
  return {
    signalAction: signal.action,
    executedBuy: true,
    executedSell: false,
    riskBlocked: false
  };
}

async function runCycle(): Promise<void> {
  const cycleId = `cycle-${Date.now()}`;
  const startedAt = Date.now();
  const accumulator: CycleAccumulator = {
    buySignals: 0,
    sellSignals: 0,
    holdSignals: 0,
    executedBuys: 0,
    executedSells: 0,
    riskBlockedCount: 0,
    errorCount: 0,
    lastError: null
  };

  if (SHOULD_EXECUTE) {
    accumulator.executedSells += await checkRiskLimits();
  }

  const openPositions = await getAllOpenPositions();
  const capitalContext = SHOULD_EXECUTE
    ? await buildRuntimeCapitalContext(openPositions)
    : {
        portfolio: buildPortfolioState({
          capital: buildCapitalSnapshot({
            freeCash: 0,
            positions: []
          }),
          allocationPlan: createAllocationPlan({
            totalCapital: 0,
            eligibleSymbols: config.trading.symbols,
            policy: equalWeightInvestmentPolicy,
          })
        })
      };

  if (SHOULD_EXECUTE) {
    const allocationSummary = capitalContext.portfolio.allocationPlan.budgets
      .map((budget) => `${budget.symbol}=${budget.budget.toFixed(2)}`)
      .join(" | ");
    logger.info("allocation plan", {
      policy: capitalContext.portfolio.allocationPlan.policyName,
      totalCapital: capitalContext.portfolio.allocationPlan.totalCapital,
      asset: CAPITAL_ASSET,
      budgets: allocationSummary
    });
  }

  for (const symbol of config.trading.symbols) {
    try {
      const result = await processSymbol(symbol, capitalContext, openPositions.length);
      updateCycleAccumulator(accumulator, result);
    } catch (error) {
      accumulator.errorCount += 1;
      accumulator.lastError =
        error instanceof Error ? error.message : String(error);
      logger.error("symbol processing failed", error, { symbol });
    }
  }

  totalCycles += 1;
  totalErrors += accumulator.errorCount;
  lastCycle = {
    cycleId,
    startedAt,
    finishedAt: Date.now(),
    durationMs: Date.now() - startedAt,
    status: accumulator.errorCount > 0 ? "ERROR" : "SUCCESS",
    symbolsProcessed: config.trading.symbols.length,
    buySignals: accumulator.buySignals,
    sellSignals: accumulator.sellSignals,
    holdSignals: accumulator.holdSignals,
    executedBuys: accumulator.executedBuys,
    executedSells: accumulator.executedSells,
    riskBlockedCount: accumulator.riskBlockedCount,
    errorCount: accumulator.errorCount,
    lastError: accumulator.lastError
  };
}

async function executeCycle(): Promise<void> {
  if (isCycleRunning) {
    skippedCycles += 1;
    lastCycle = {
      cycleId: `cycle-skip-${Date.now()}`,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      durationMs: 0,
      status: "SKIPPED",
      symbolsProcessed: 0,
      buySignals: 0,
      sellSignals: 0,
      holdSignals: 0,
      executedBuys: 0,
      executedSells: 0,
      riskBlockedCount: 0,
      errorCount: 0,
      lastError: "Previous cycle still running."
    };
    await persistWorkerRuntimeSnapshot();
    await createOperationalAlert({
      severity: "warn",
      code: "WORKER_CYCLE_SKIPPED",
      message: "Worker cycle skipped because the previous cycle is still running."
    });
    logger.warn("cycle skipped", {
      reason: "previous cycle still running"
    });
    return;
  }

  isCycleRunning = true;
  workerStatus = "running";
  await persistWorkerRuntimeSnapshot();

  try {
    await runCycle();
    workerStatus = "idle";
  } catch (error) {
    totalErrors += 1;
    workerStatus = "error";
    lastCycle = {
      cycleId: `cycle-error-${Date.now()}`,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      durationMs: 0,
      status: "ERROR",
      symbolsProcessed: 0,
      buySignals: 0,
      sellSignals: 0,
      holdSignals: 0,
      executedBuys: 0,
      executedSells: 0,
      riskBlockedCount: 0,
      errorCount: 1,
      lastError: error instanceof Error ? error.message : String(error)
    };
    await createOperationalAlert({
      severity: "error",
      code: "WORKER_CYCLE_ERROR",
      message: "Worker cycle failed.",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  } finally {
    isCycleRunning = false;
    await persistWorkerRuntimeSnapshot();
  }
}

async function start(): Promise<void> {
  const intervalMs = workerIntervalMs;

  logger.info("worker starting", {
    mode: config.executionMode,
    interval: intervalMs === 0 ? "single-run" : `${intervalMs}ms`
  });

  if (SHOULD_EXECUTE) {
    logger.info("worker risk config", {
      stopLossPct: STOP_LOSS,
      takeProfitPct: TAKE_PROFIT,
      maxOpenTrades: MAX_OPEN,
      maxPositionSizePct: MAX_POSITION_SIZE_PCT,
      maxPortfolioExposurePct: MAX_PORTFOLIO_EXPOSURE_PCT,
      minOrderNotional: MIN_ORDER_NOTIONAL,
      maxDailyLossPct: MAX_DAILY_LOSS_PCT,
      cooldownMs: RISK_COOLDOWN_MS,
      consecutiveLossLimit: CONSECUTIVE_LOSS_LIMIT,
      capitalAsset: CAPITAL_ASSET,
      capitalCap:
        config.trading.maxDeployableCapitalUsdt ??
        (IS_PAPER ? PAPER_INITIAL_CAPITAL : "full-balance")
    });
  }

  await persistWorkerRuntimeSnapshot();
  await executeCycle();

  if (intervalMs === 0) {
    process.exit(0);
  }

  setInterval(() => {
    void executeCycle().catch((error) => {
      logger.error("worker cycle failed", error);
    });
  }, intervalMs);
}

start();
