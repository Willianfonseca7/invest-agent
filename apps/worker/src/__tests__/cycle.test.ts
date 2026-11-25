import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenPosition } from "@invest-agent/shared-types";
const state = vi.hoisted(() => ({
  positions: [] as OpenPosition[],
  execute: vi.fn(),
  decisions: vi.fn(),
  candles: vi.fn(),
  maxOpen: 2,
  exposure: 1
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
  getAllOpenPositions: async () => [...state.positions],
  getOpenPosition: async (symbol: string) => state.positions.find(p => p.symbol === symbol),
  readTradeLedger: async () => [],
  appendRiskDecision: state.decisions,
  appendHistoryItem: vi.fn(),
  appendOperationalAlert: vi.fn(),
  writeWorkerRuntimeSnapshot: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
import { runCycle } from "../index";

describe("worker capital consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.positions = [];
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
  it("aborts remaining symbols after an execution error", async () => {
    state.execute.mockRejectedValueOnce(new Error("partial persistence"));
    await runCycle();
    expect(state.execute).toHaveBeenCalledTimes(1);
    expect(state.candles).toHaveBeenCalledTimes(2);
  });
});
