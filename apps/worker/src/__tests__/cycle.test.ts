import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenPosition } from "@invest-agent/shared-types";
import { FinancialStateUnavailableError } from "@invest-agent/utils";
const state = vi.hoisted(() => ({
  positions: [] as OpenPosition[],
  execute: vi.fn(),
  decisions: vi.fn(),
  candles: vi.fn(),
  maxOpen: 2,
  exposure: 1,
  ledger: vi.fn().mockResolvedValue([]),
  positionsRead: vi.fn(),
  snapshot: vi.fn(),
  alert: vi.fn(),
  errorLog: vi.fn()
}));
vi.mock("@invest-agent/config", () => ({ config: {
  executionMode: "test",
  trading: { symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"], capitalAsset: "USDT", paperInitialCapitalUsdt: 1000, maxDeployableCapitalUsdt: null },
  risk: { stopLossPct: 0.03, takeProfitPct: 0.05, get maxOpenTrades() { return state.maxOpen; }, maxPositionSizePct: 1, get maxPortfolioExposurePct() { return state.exposure; }, minOrderNotional: 10, maxDailyLossPct: 0.05, cooldownMs: 0, consecutiveLossLimit: 0 }
}}));
vi.mock("@invest-agent/exchange-adapters", () => ({ BinanceAdapter: class {
  getTicker = async () => ({ price: 100 });
  getCandles = state.candles;
}}));
vi.mock("@invest-agent/execution-layer", () => ({ ExecutionLayer: class { execute = state.execute; } }));
vi.mock("@invest-agent/strategy-engine", () => ({ analyzeMultiTimeframeMarket: () => ({ action: "BUY", price: 100, confidence: 1, reason: { summary: "test" } }) }));
vi.mock("@invest-agent/utils", () => ({
  FinancialStateUnavailableError: class extends Error {
    constructor(readonly code: string) { super("Financial state is unavailable"); }
  },
  getAllOpenPositions: async () => { await state.positionsRead(); return [...state.positions]; },
  getOpenPosition: async (symbol: string) => state.positions.find(p => p.symbol === symbol),
  readTradeLedger: state.ledger,
  appendRiskDecision: state.decisions,
  appendHistoryItem: vi.fn(),
  appendOperationalAlert: state.alert,
  writeWorkerRuntimeSnapshot: state.snapshot,
  logger: { info: vi.fn(), warn: vi.fn(), error: state.errorLog }
}));
import { executeCycle, runCycle } from "../index";

describe("worker capital consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.positions = [];
    state.ledger.mockReset().mockResolvedValue([]);
    state.positionsRead.mockReset();
    state.snapshot.mockReset();
    state.alert.mockReset();
    state.execute.mockReset().mockImplementation(async ({ symbol, quoteOrderQty }) => {
      state.positions.push({ symbol, side: "BUY", entryPrice: 100, quantity: quoteOrderQty / 100, orderId: symbol, openedAt: 1 });
      return { orderId: symbol, executedPrice: 100, quantity: quoteOrderQty / 100, quoteAmount: quoteOrderQty };
    });
  });
  it("blocks the third buy after two positions are persisted", async () => {
    await runCycle();
    expect(state.execute).toHaveBeenCalledTimes(2);
    expect(state.decisions).toHaveBeenLastCalledWith(expect.objectContaining({ code: "MAX_OPEN_TRADES_REACHED", metadata: expect.objectContaining({ openPositionsCount: 2 }) }));
    expect(state.positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0)).toBeLessThanOrEqual(1000);
  });
  it("revalidates available cash after the first execution", async () => {
    state.execute.mockImplementationOnce(async ({ symbol }) => {
      state.positions.push({ symbol, side: "BUY", entryPrice: 100, quantity: 9, orderId: symbol, openedAt: 1 });
      return { orderId: symbol, executedPrice: 100, quantity: 9, quoteAmount: 900 };
    });
    await runCycle();
    expect(state.execute).toHaveBeenCalledTimes(2);
    expect(state.execute.mock.calls[1][0].quoteOrderQty).toBe(100);
    expect(state.positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0)).toBe(1000);
  });
  it("blocks protective exits when ledger is unavailable and recovers on a valid next cycle", async () => {
    state.positions = [{ symbol: "BTCUSDT", side: "BUY", entryPrice: 110, quantity: 1, orderId: "p", openedAt: 1 }];
    state.ledger.mockRejectedValueOnce(new Error("storage detail"));
    await expect(runCycle()).rejects.toThrow("storage detail");
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.positionsRead).not.toHaveBeenCalled();
    state.execute.mockImplementationOnce(async () => { state.positions = []; return { orderId: "sell", executedPrice: 100, quantity: 1, quoteAmount: 100 }; });
    await runCycle();
    expect(state.execute).toHaveBeenCalledWith(expect.objectContaining({ side: "SELL", trigger: "STOP_LOSS" }));
  });
  it("releases the cycle guard after initial snapshot failure", async () => {
    state.snapshot.mockRejectedValueOnce(new Error("snapshot unavailable"));
    await expect(executeCycle()).rejects.toThrow("snapshot unavailable");
    expect(state.execute).not.toHaveBeenCalled();
    await executeCycle();
    expect(state.execute).toHaveBeenCalled();
  });
  it("reports a safe failure category when state is unavailable", async () => {
    state.ledger.mockRejectedValueOnce(new FinancialStateUnavailableError("REDIS_UNAVAILABLE"));
    await expect(executeCycle()).rejects.toThrow("Financial state is unavailable");
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.errorLog).toHaveBeenCalledWith("worker cycle failed", expect.any(Error),
      expect.objectContaining({ failureCode: "REDIS_UNAVAILABLE" }));
  });
  it("releases the cycle guard after final snapshot failure", async () => {
    state.snapshot.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("snapshot unavailable"));
    await expect(executeCycle()).rejects.toThrow("Worker runtime snapshot failed");
    const firstCycleReads = state.ledger.mock.calls.length;
    await executeCycle();
    expect(state.ledger.mock.calls.length).toBeGreaterThan(firstCycleReads);
  });
  it("preserves an execution failure when the operational alert also fails", async () => {
    const executionFailure = new Error("private execution detail");
    state.ledger.mockRejectedValueOnce(executionFailure);
    state.alert.mockRejectedValueOnce(new Error("private alert detail"));

    await expect(executeCycle()).rejects.toBe(executionFailure);
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.alert).toHaveBeenCalledWith(expect.objectContaining({ code: "WORKER_CYCLE_ERROR" }));
    expect(state.errorLog).toHaveBeenCalledWith("worker operational alert failed", expect.any(Error));
    const loggedText = state.errorLog.mock.calls.map(([message, error, context]) =>
      `${message} ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(context)}`
    ).join(" ");
    expect(loggedText).not.toMatch(/private execution detail|private alert detail/);

    await executeCycle();
    expect(state.execute).toHaveBeenCalled();
  });
  it("preserves an execution failure when the final snapshot also fails", async () => {
    const executionFailure = new Error("private execution detail");
    state.ledger.mockRejectedValueOnce(executionFailure);
    state.snapshot.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("private snapshot detail"));

    await expect(executeCycle()).rejects.toBe(executionFailure);
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.errorLog).toHaveBeenCalledWith("worker runtime snapshot failed", expect.any(Error));
    const loggedText = state.errorLog.mock.calls.map(([message, error, context]) =>
      `${message} ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(context)}`
    ).join(" ");
    expect(loggedText).not.toMatch(/private execution detail|private snapshot detail/);

    await executeCycle();
    expect(state.execute).toHaveBeenCalled();
  });
  it("keeps the owner guard while its final snapshot is pending and another cycle skips", async () => {
    let releaseSnapshot: (() => void) | undefined;
    const finalSnapshot = new Promise<void>((resolve) => { releaseSnapshot = resolve; });
    state.snapshot.mockResolvedValueOnce(undefined).mockImplementationOnce(() => finalSnapshot);

    const owner = executeCycle();
    await vi.waitFor(() => expect(state.snapshot).toHaveBeenCalledTimes(2));
    const ownerReads = state.ledger.mock.calls.length;
    await executeCycle();
    await executeCycle();
    expect(state.ledger).toHaveBeenCalledTimes(ownerReads);
    expect(state.execute).toHaveBeenCalledTimes(2);

    releaseSnapshot?.();
    await owner;
    await executeCycle();
    expect(state.ledger.mock.calls.length).toBeGreaterThan(ownerReads);
  });
  it("preserves an undefined execution rejection through both reporting failures", async () => {
    state.ledger.mockRejectedValueOnce(undefined);
    state.alert.mockRejectedValueOnce(new Error("private alert detail"));
    state.snapshot.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("private snapshot detail"));

    await expect(executeCycle()).rejects.toBeUndefined();
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.errorLog).toHaveBeenCalledWith("worker operational alert failed", expect.objectContaining({ message: "Worker operational alert failed" }));
    expect(state.errorLog).toHaveBeenCalledWith("worker runtime snapshot failed", expect.objectContaining({ message: "Worker runtime snapshot failed" }));

    await executeCycle();
    expect(state.execute).toHaveBeenCalled();
  });
  it("aborts remaining symbols after an execution error", async () => {
    state.execute.mockRejectedValueOnce(new Error("partial persistence"));
    await expect(runCycle()).rejects.toThrow("Worker cycle failed");
    expect(state.execute).toHaveBeenCalledTimes(1);
    expect(state.candles).toHaveBeenCalledTimes(2);
  });
});
